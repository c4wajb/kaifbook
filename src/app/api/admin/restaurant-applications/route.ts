import { handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";

const statusPriority: Record<string, number> = { new: 0, in_review: 1, approved: 2, rejected: 3 };

export async function GET() {
  try {
    await requireAdmin();

    const applications = (await prisma.restaurantLead.findMany({ orderBy: { createdAt: "desc" } })).sort((a, b) => {
      const statusDelta = (statusPriority[a.status] ?? 10) - (statusPriority[b.status] ?? 10);
      return statusDelta || b.createdAt.getTime() - a.createdAt.getTime();
    });

    return ok({ applications });
  } catch (error) {
    return handleApiError(error);
  }
}
