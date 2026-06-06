import { EXTERNAL_PAYMENT_STATUSES, RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

const CANCELLED_STATUSES = [
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
] as string[];

export async function getNoShowDepositAnalytics(restaurantId: string) {
  const reservations = await prisma.reservation.findMany({ where: { restaurantId }, include: { table: { include: { tableType: true } } } });
  const total = reservations.length;
  const noShows = reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW);
  const small = reservations.filter((reservation) => (reservation.table?.tableType?.code === "small" || (reservation.table?.maxGuests ?? reservation.table?.seats ?? 0) <= 3));
  const large = reservations.filter((reservation) => (reservation.table?.tableType?.code === "large" || (reservation.table?.maxGuests ?? reservation.table?.seats ?? 0) >= 6));
  const withDeposit = reservations.filter((reservation) => reservation.isDepositRequired);
  const withoutDeposit = reservations.filter((reservation) => !reservation.isDepositRequired);
  const guestConfirmed = reservations.filter((reservation) => reservation.guestConfirmedAt);
  const guestNotConfirmed = reservations.filter((reservation) => !reservation.guestConfirmedAt);

  return {
    metrics: {
      totalReservations: total,
      noShowRate: percent(noShows.length, total),
      smallTableNoShowRate: percent(small.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, small.length),
      largeTableNoShowRate: percent(large.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, large.length),
      depositReservations: withDeposit.length,
      paidDeposits: reservations.filter((reservation) => reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT).length,
      expiredPayments: reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.PAYMENT_EXPIRED || reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.CANCELLED).length,
      cancelledAhead: reservations.filter((reservation) => CANCELLED_STATUSES.includes(reservation.status)).length,
      guestConfirmed: guestConfirmed.length,
      noShowWithConfirmation: percent(guestConfirmed.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, guestConfirmed.length),
      noShowWithoutConfirmation: percent(guestNotConfirmed.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, guestNotConfirmed.length),
      noShowWithDeposit: percent(withDeposit.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, withDeposit.length),
      noShowWithoutDeposit: percent(withoutDeposit.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length, withoutDeposit.length),
      awaitingPayment: reservations.filter((reservation) => reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT).length,
    },
    insights: [
      "Большие столы без депозита чаще создают риск пустой посадки.",
      "Гости, подтвердившие бронь по ссылке, приходят чаще.",
      "Депозит для больших столов помогает снизить риск пустых посадок.",
      `${reservations.filter((reservation) => reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT).length} заявок ожидают оплаты ресторану.`,
    ],
  };
}
