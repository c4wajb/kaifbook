import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { adminRestaurantStatusSchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function PATCH(request: Request, context: C) {
  try {
    const user = await getCurrentUser();
    if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) throw new ApiError(403, "Нет доступа");
    const { restaurantId } = await context.params;
    const payload = adminRestaurantStatusSchema.parse(await readJson(request));
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: payload.status,
        isActive: payload.isActive,
        isFeatured: payload.isFeatured,
        bannerTitle: payload.bannerTitle,
        bannerSubtitle: payload.bannerSubtitle,
        bannerImage: payload.bannerImage,
        bannerSortOrder: payload.bannerSortOrder,
      },
    });
    return ok({ restaurant });
  } catch (error) {
    return handleApiError(error);
  }
}
