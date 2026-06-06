import { z } from "zod";
import { ApiError } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { dateFromInput } from "@/lib/time";
import { validateReservationBusinessRules } from "@/lib/reservations";

export const reservationRescheduleSchema = z.object({
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  guestsCount: z.coerce.number().int().positive().optional(),
  comment: z.string().trim().optional().nullable(),
});

export async function getReservationByConfirmationToken(token: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { confirmationToken: token },
    include: {
      restaurant: { select: { id: true, title: true, slug: true, address: true, phone: true, ownerId: true } },
      hall: { select: { title: true } },
      table: { include: { tableType: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!reservation) throw new ApiError(404, "Заявка не найдена.");
  return reservation;
}

export async function acceptReservationByToken(token: string) {
  const reservation = await getReservationByConfirmationToken(token);
  const paidOrRestaurantConfirmedStatuses = [
    RESERVATION_STATUSES.DEPOSIT_PAID,
    RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
    RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
    RESERVATION_STATUSES.CONFIRMED,
  ] as string[];
  const paidOrRestaurantConfirmed = paidOrRestaurantConfirmedStatuses.includes(reservation.status);

  const status = reservation.status === RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT
    ? RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT
    : paidOrRestaurantConfirmed
      ? RESERVATION_STATUSES.CONFIRMED
      : RESERVATION_STATUSES.CONFIRMED_BY_GUEST;

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status,
      guestConfirmedAt: new Date(),
      noShowRiskLevel: "low",
      noShowRiskScore: 5,
      confirmedAt: status === RESERVATION_STATUSES.CONFIRMED ? new Date() : reservation.confirmedAt,
    },
  });

  await prisma.notification.create({
    data: {
      userId: reservation.restaurant.ownerId,
      restaurantId: reservation.restaurantId,
      reservationId: reservation.id,
      type: "reservation_guest_confirmed",
      title: "Гость подтвердил визит",
      message: `${reservation.customerName} подтвердил визит на ${reservation.startTime}`,
    },
  });

  return updated;
}

export async function cancelReservationByToken(token: string) {
  const reservation = await getReservationByConfirmationToken(token);
  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: RESERVATION_STATUSES.CANCELLED_BY_GUEST,
      cancelledAt: new Date(),
      cancellationReason: "Гость отменил визит по ссылке подтверждения",
      noShowRiskLevel: "low",
    },
  });

  await prisma.notification.create({
    data: {
      userId: reservation.restaurant.ownerId,
      restaurantId: reservation.restaurantId,
      reservationId: reservation.id,
      type: "reservation_guest_cancelled",
      title: "Гость отменил визит",
      message: `${reservation.customerName} отменил визит на ${reservation.startTime}`,
    },
  });

  return updated;
}

export async function rescheduleReservationByToken(token: string, payload: z.infer<typeof reservationRescheduleSchema>) {
  const reservation = await getReservationByConfirmationToken(token);
  const input = {
    hallId: reservation.hallId,
    tableId: reservation.tableId,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    customerEmail: reservation.customerEmail,
    guestsCount: payload.guestsCount ?? reservation.guestsCount,
    reservationDate: payload.reservationDate,
    startTime: payload.startTime,
    endTime: payload.endTime || reservation.endTime,
    occasion: reservation.occasion,
    comment: payload.comment ?? reservation.comment,
  };
  const validated = await validateReservationBusinessRules(reservation.restaurantId, input, { excludeReservationId: reservation.id });

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      reservationDate: dateFromInput(payload.reservationDate),
      startTime: payload.startTime,
      endTime: validated.endTime,
      guestsCount: input.guestsCount,
      comment: input.comment,
      status: RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
      guestConfirmedAt: null,
      noShowRiskLevel: "medium",
      noShowRiskScore: 45,
    },
  });

  await prisma.notification.create({
    data: {
      userId: reservation.restaurant.ownerId,
      restaurantId: reservation.restaurantId,
      reservationId: reservation.id,
      type: "reservation_reschedule_requested",
      title: "Гость перенёс визит",
      message: `${reservation.customerName}: новая дата ${payload.reservationDate}, ${payload.startTime}`,
    },
  });

  return updated;
}
