import { handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { restaurantDataFromPayload } from "@/lib/restaurant-data";
import { restaurantSchema } from "@/lib/validation";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const user = await requireAuth();
    const { restaurantId } = await context.params;
    const restaurant = await requireRestaurantAccess(user, restaurantId);
    return ok({ restaurant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: C) {
  try {
    const user = await requireAuth();
    const { restaurantId } = await context.params;
    const current = await requireRestaurantAccess(user, restaurantId);
    const payload = restaurantSchema.parse(await readJson(request));
    const data = await restaurantDataFromPayload({ ...payload, status: payload.status || current.status, isActive: payload.isActive ?? current.isActive }, current.id);
    const restaurant = await prisma.restaurant.update({ where: { id: current.id }, data });
    return ok({ restaurant });
  } catch (error) {
    return handleApiError(error);
  }
}
