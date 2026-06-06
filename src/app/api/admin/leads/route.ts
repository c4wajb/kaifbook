import { handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const leads = await prisma.restaurantLead.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ leads });
  } catch (error) {
    return handleApiError(error);
  }
}
