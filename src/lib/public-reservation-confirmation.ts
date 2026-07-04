import { z } from "zod";
import { ApiError } from "@/lib/api";
import { EXTERNAL_PAYMENT_STATUSES, RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getBookingPhase, isClosedBooking } from "@/lib/reservation-status";
import { dateFromInput } from "@/lib/time";
import { validateReservationBusinessRules } from "@/lib/reservations";
import { notifyRestaurantReservationEvent } from "@/lib/verifications";

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
      restaurant: { select: { id: true, title: true, slug: true, address: true, phone: true, ownerId: true, vkNotifyPeerId: true } },
      hall: { select: { title: true } },
      table: { include: { tableType: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!reservation) throw new ApiError(404, "Заявка не найдена.");
  return reservation;
}

// A confirmation-token action must not move a reservation out of a terminal
// state (e.g. re-confirming a completed booking, or reviving an expired-deposit
// one). Delegate to the canonical lifecycle helper so payment_expired etc. are
// always covered — no hand-rolled list to drift.
function assertActionable(status: string, message: string) {
  if (isClosedBooking(status)) throw new ApiError(409, message);
}

export async function acceptReservationByToken(token: string) {
  const reservation = await getReservationByConfirmationToken(token);
  assertActionable(reservation.status, "Эта бронь уже закрыта и не может быть подтверждена.");
  const paidOrRestaurantConfirmedStatuses = [
    RESERVATION_STATUSES.DEPOSIT_PAID,
    RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
    RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
    RESERVATION_STATUSES.CONFIRMED,
  ] as string[];
  const paidOrRestaurantConfirmed = paidOrRestaurantConfirmedStatuses.includes(reservation.status);

  // A guest tapping «Я приду» on a not-yet-approved request records their
  // confirmation but must NOT self-approve: the booking stays in the manager's
  // «Нужно подтвердить» queue (with the «Гость подтвердил визит» badge). Only
  // already-approved bookings advance to CONFIRMED; unpaid deposits stay put.
  const status = getBookingPhase(reservation.status) === "needs_confirmation"
    ? reservation.status
    : reservation.status === RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT
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

  await notifyRestaurantReservationEvent({
    event: "confirmed",
    restaurantTitle: reservation.restaurant.title,
    vkNotifyPeerId: reservation.restaurant.vkNotifyPeerId,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    guestsCount: reservation.guestsCount,
    reservationDate: reservation.reservationDate,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  });

  return updated;
}

export async function cancelReservationByToken(token: string) {
  const reservation = await getReservationByConfirmationToken(token);
  assertActionable(reservation.status, "Эта бронь уже закрыта и не может быть отменена.");
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

  await notifyRestaurantReservationEvent({
    event: "cancelled",
    restaurantTitle: reservation.restaurant.title,
    vkNotifyPeerId: reservation.restaurant.vkNotifyPeerId,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    guestsCount: reservation.guestsCount,
    reservationDate: reservation.reservationDate,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  });

  return updated;
}

export async function rescheduleReservationByToken(token: string, payload: z.infer<typeof reservationRescheduleSchema>) {
  const reservation = await getReservationByConfirmationToken(token);
  assertActionable(reservation.status, "Эта бронь уже закрыта и не может быть перенесена.");
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
      // An unpaid-deposit booking must return to the payment queue, not the
      // confirmation queue (otherwise the owner is offered «Подтвердить», which
      // the API rejects until the deposit is paid).
      status:
        reservation.paymentRequired && reservation.paymentStatus !== EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT
          ? RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT
          : RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
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

  await notifyRestaurantReservationEvent({
    event: "rescheduled",
    restaurantTitle: reservation.restaurant.title,
    vkNotifyPeerId: reservation.restaurant.vkNotifyPeerId,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    guestsCount: input.guestsCount,
    reservationDate: updated.reservationDate,
    startTime: updated.startTime,
    endTime: updated.endTime,
  });

  return updated;
}
