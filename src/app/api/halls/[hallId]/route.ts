import { ApiError, handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireHallAccess } from "@/lib/permissions";
import { todayUtcMidnight } from "@/lib/time";
import { hallSchema } from "@/lib/validation";
type C = { params: Promise<{ hallId: string }> };

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

export async function PUT(request: Request, context: C) {
  try {
    const { hallId } = await context.params;
    const user = await requireAuth();
    await requireHallAccess(user, hallId);
    const payload = hallSchema.partial().parse(await readJson(request));
    const hall = await prisma.hall.update({ where: { id: hallId }, data: payload, include: { tables: true, objects: true } });
    return ok({ hall });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: C) {
  try {
    const { hallId } = await context.params;
    const user = await requireAuth();
    await requireHallAccess(user, hallId);
    const futureReservations = await prisma.reservation.count({
      where: {
        hallId,
        reservationDate: { gte: todayUtcMidnight() },
        status: { in: OCCUPYING_STATUSES },
      },
    });
    if (futureReservations > 0) {
      throw new ApiError(409, "Нельзя удалить зал, в котором есть активные или будущие брони. Сначала перенесите или отмените брони.");
    }

    await prisma.hall.delete({ where: { id: hallId } });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
