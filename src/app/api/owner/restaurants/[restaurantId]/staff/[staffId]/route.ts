import { ApiError, handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string; staffId: string }> };

export async function DELETE(_request: Request, context: C) {
  try {
    const { restaurantId, staffId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const access = await prisma.restaurantStaffAccess.findFirst({ where: { id: staffId, restaurantId } });
    if (!access) throw new ApiError(404, "Сотрудник не найден");
    await prisma.restaurantStaffAccess.delete({ where: { id: staffId } });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
