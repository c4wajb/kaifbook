import { ApiError, handleApiError, ok, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireReservationManagementAccess } from "@/lib/reservation-access";
import { isClosedBooking } from "@/lib/reservation-status";
import { sendMessengerMessage } from "@/lib/verifications";

type C = { params: Promise<{ reservationId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    const user = await requireAuth();
    await requireReservationManagementAccess(user, reservationId);
    const current = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { status: true, noShowRiskLevel: true, noShowRiskScore: true } });
    if (!current) throw new ApiError(404, "Заявка не найдена.");
    if (isClosedBooking(current.status)) throw new ApiError(409, "Бронь уже закрыта — запросить подтверждение нельзя.");
    // Chasing a confirmation raises attention but must never downgrade an
    // already-high no-show risk to medium.
    const riskHigh = current.noShowRiskLevel === "high";
    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        confirmationRequestedAt: new Date(),
        noShowRiskLevel: riskHigh ? "high" : "medium",
        noShowRiskScore: Math.max(current.noShowRiskScore, 45),
      },
      include: { restaurant: { select: { title: true } } },
    });
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/reservation/confirm/${reservation.confirmationToken}`;
    const peer = reservation.verifiedExternalChatId || reservation.verifiedExternalUserId;
    if (reservation.verificationProvider && peer) {
      await sendMessengerMessage(
        reservation.verificationProvider,
        peer,
        `Kaifbook: ресторан ${reservation.restaurant.title} просит подтвердить вашу бронь. Подтвердите визит по ссылке: ${confirmationUrl}`,
      );
    }
    return ok({ reservation, confirmationUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
