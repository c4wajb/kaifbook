import { handleApiError, ok, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireReservationManagementAccess } from "@/lib/reservation-access";

type C = { params: Promise<{ reservationId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    const user = await requireAuth();
    await requireReservationManagementAccess(user, reservationId);
    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: { confirmationRequestedAt: new Date(), noShowRiskLevel: "medium", noShowRiskScore: 45 },
      include: { restaurant: { select: { title: true } } },
    });
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/reservation/confirm/${reservation.confirmationToken}`;
    return ok({ reservation, confirmationUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
