import { handleApiError, ok, requireStaffOrOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireStaffOrOwnerAccess(restaurantId);
    const q = new URL(request.url).searchParams.get("q")?.trim();
    const guests = await prisma.guest.findMany({
      where: { restaurantId, OR: q ? [{ name: { contains: q } }, { phone: { contains: q } }] : undefined },
      orderBy: [{ reservationsCount: "desc" }, { updatedAt: "desc" }],
    });
    return ok({ guests });
  } catch (error) {
    return handleApiError(error);
  }
}
