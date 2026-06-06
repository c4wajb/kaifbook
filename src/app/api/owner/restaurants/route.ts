import { ApiError, handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { canCreateRestaurant } from "@/lib/permissions";
import { restaurantDataFromPayload } from "@/lib/restaurant-data";
import { restaurantSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireAuth();
    const restaurants = await prisma.restaurant.findMany({ where: user.role === ROLES.ADMIN ? {} : { ownerId: user.id }, orderBy: { updatedAt: "desc" } });
    return ok({ restaurants });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!canCreateRestaurant(user)) throw new ApiError(403, "Only restaurant roles can create restaurants");
    const payload = restaurantSchema.parse(await readJson(request));
    const data = await restaurantDataFromPayload(payload);
    const restaurant = await prisma.restaurant.create({ data: { ...data, ownerId: user.id } });
    await prisma.reservationSettings.create({ data: { restaurantId: restaurant.id } });
    return ok({ restaurant }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
