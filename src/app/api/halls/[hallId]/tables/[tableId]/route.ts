import { ApiError, handleApiError, ok, requireAuth } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireHallAccess } from "@/lib/permissions";
import { todayUtcMidnight } from "@/lib/time";

type C = { params: Promise<{ hallId: string; tableId: string }> };

const OCCUPYING_STATUSES = [
  RESERVATION_STATUSES.NEW,
  RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
  RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
  RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT,
  RESERVATION_STATUSES.DEPOSIT_PAID,
  RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
  RESERVATION_STATUSES.CONFIRMED,
  RESERVATION_STATUSES.SEATED,
] as string[];

export async function DELETE(_request: Request, context: C) {
  try {
    const { hallId, tableId } = await context.params;
    const user = await requireAuth();
    await requireHallAccess(user, hallId);

    const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, hallId }, select: { id: true, number: true } });
    if (!table) throw new ApiError(404, "Стол не найден");

    const futureReservations = await prisma.reservation.count({
      where: {
        tableId,
        reservationDate: { gte: todayUtcMidnight() },
        status: { in: OCCUPYING_STATUSES },
      },
    });
    if (futureReservations > 0) {
      throw new ApiError(409, "У этого стола есть активные или будущие брони. Сначала перенесите или отмените брони.");
    }

    await prisma.restaurantTable.delete({ where: { id: tableId } });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
