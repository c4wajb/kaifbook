import { handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { vkNotifyPeerId: null, vkNotifyName: null } });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
