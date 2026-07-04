import { PAYMENT_STATUSES, RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { notifyGuestReservationStatus } from "@/lib/verifications";

export type PaymentProvider = {
  createPayment(reservationId: string, amount: number, description: string, returnUrl: string): Promise<{ id: string; paymentUrl: string | null; providerPaymentId: string }>;
  getPaymentStatus(providerPaymentId: string): Promise<string>;
  refundPayment(paymentId: string, amount: number): Promise<void>;
  cancelPayment(paymentId: string): Promise<void>;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(reservationId: string, amount: number, description: string, returnUrl: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { restaurantId: true, guestId: true } });
    if (!reservation) throw new Error("Reservation not found");
    const providerPaymentId = `mock_${crypto.randomUUID()}`;
    const payment = await prisma.payment.create({
      data: {
        reservationId,
        restaurantId: reservation.restaurantId,
        guestId: reservation.guestId,
        amount,
        provider: "mock",
        providerPaymentId,
        status: PAYMENT_STATUSES.WAITING_FOR_PAYMENT,
      },
      select: { id: true },
    });
    const paymentUrl = `${appUrl()}/payment/mock/${payment.id}?returnUrl=${encodeURIComponent(returnUrl)}&description=${encodeURIComponent(description)}`;
    await prisma.payment.update({ where: { id: payment.id }, data: { paymentUrl } });
    return { id: payment.id, paymentUrl, providerPaymentId };
  }

  async getPaymentStatus(providerPaymentId: string) {
    const payment = await prisma.payment.findFirst({ where: { providerPaymentId }, select: { status: true } });
    return payment?.status ?? PAYMENT_STATUSES.FAILED;
  }

  async refundPayment(paymentId: string) {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: PAYMENT_STATUSES.REFUNDED, refundedAt: new Date() } });
  }

  async cancelPayment(paymentId: string) {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: PAYMENT_STATUSES.CANCELLED } });
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

export async function markPaymentPaid(paymentId: string) {
  const now = new Date();
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PAYMENT_STATUSES.PAID, paidAt: now },
    include: { reservation: { include: { restaurant: { include: { settings: true } } } } },
  });

  const nextStatus = payment.reservation.restaurant.settings?.autoConfirmEnabled ? RESERVATION_STATUSES.CONFIRMED : RESERVATION_STATUSES.DEPOSIT_PAID;
  await prisma.reservation.update({
    where: { id: payment.reservationId },
    data: { status: nextStatus, noShowRiskLevel: "low", noShowRiskScore: 5, confirmedAt: nextStatus === RESERVATION_STATUSES.CONFIRMED ? now : payment.reservation.confirmedAt },
  });
  await notifyGuestReservationStatus({ ...payment.reservation, restaurantTitle: payment.reservation.restaurant.title }, nextStatus);

  return prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { reservation: { include: { restaurant: { include: { settings: true } } } } },
  });
}

export async function expireOverdueDepositPayments(restaurantId?: string) {
  const payments = await prisma.payment.findMany({
    where: { status: PAYMENT_STATUSES.WAITING_FOR_PAYMENT, restaurantId: restaurantId || undefined },
    include: { reservation: { include: { restaurant: { include: { depositSettings: true } } } } },
  });
  const now = Date.now();
  const expired: string[] = [];
  for (const payment of payments) {
    const timeout = payment.reservation.restaurant.depositSettings?.paymentTimeoutMinutes ?? 20;
    if (now - payment.createdAt.getTime() < timeout * 60_000) continue;
    const { count } = await prisma.payment.updateMany({
      where: { id: payment.id, status: PAYMENT_STATUSES.WAITING_FOR_PAYMENT },
      data: { status: PAYMENT_STATUSES.EXPIRED },
    });
    if (count > 0) {
      // Only expire a booking that is still waiting for its deposit — never
      // clobber one that was meanwhile paid, confirmed or cancelled.
      const { count: reservationUpdated } = await prisma.reservation.updateMany({
        where: { id: payment.reservationId, status: RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT },
        data: { status: RESERVATION_STATUSES.PAYMENT_EXPIRED },
      });
      if (reservationUpdated > 0) {
        await notifyGuestReservationStatus(
          { ...payment.reservation, restaurantTitle: payment.reservation.restaurant.title },
          RESERVATION_STATUSES.PAYMENT_EXPIRED,
        );
      }
      expired.push(payment.id);
    }
  }
  return expired;
}
