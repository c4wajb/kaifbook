import { ApiError, handleApiError, ok } from "@/lib/api";
import { EXTERNAL_PAYMENT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { EXTERNAL_PAYMENT_DISCLAIMER } from "@/lib/external-payments";

type C = { params: Promise<{ reservationId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, paymentRequired: true, paymentStatus: true, paymentAmount: true, paymentUrl: true },
    });
    if (!reservation) throw new ApiError(404, "Заявка не найдена.");
    if (!reservation.paymentRequired || reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.NOT_REQUIRED) throw new ApiError(400, "Для этой заявки оплата не требуется.");
    if (!reservation.paymentUrl) throw new ApiError(400, "Ссылка на оплату временно недоступна. Свяжитесь с рестораном.");
    return ok({
      payment: {
        amount: reservation.paymentAmount,
        paymentUrl: reservation.paymentUrl,
        status: reservation.paymentStatus,
      },
      disclaimer: EXTERNAL_PAYMENT_DISCLAIMER,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
