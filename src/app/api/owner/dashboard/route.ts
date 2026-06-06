import { handleApiError, ok, requireAuth } from "@/lib/api";
import { OWNER_ROLES, RESERVATION_STATUSES, ROLES } from "@/lib/constants";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!(OWNER_ROLES as readonly string[]).includes(user.role)) throw new ApiError(403, "Owner role required");
    const restaurant = user.role === ROLES.ADMIN ? undefined : { is: { ownerId: user.id } };
    const [restaurants, newReservations, guests] = await Promise.all([
      prisma.restaurant.count({ where: user.role === ROLES.ADMIN ? {} : { ownerId: user.id } }),
      prisma.reservation.count({ where: { restaurant, status: RESERVATION_STATUSES.NEW } }),
      prisma.guest.count({ where: { restaurant } }),
    ]);
    return ok({ restaurants, newReservations, guests });
  } catch (error) {
    return handleApiError(error);
  }
}
