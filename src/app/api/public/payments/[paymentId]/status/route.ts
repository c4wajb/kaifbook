import { ApiError, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { timingSafeEqualString } from "@/lib/secrets";

type C = { params: Promise<{ paymentId: string }> };

export async function GET(request: Request, context: C) {
  try {
    const { paymentId } = await context.params;
    const token = new URL(request.url).searchParams.get("token") || "";
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: { select: { id: true, status: true, confirmationToken: true } } },
    });
    if (!payment) throw new ApiError(404, "Платеж не найден");
    // Authorize via the reservation's confirmation token (the per-reservation
    // capability the legitimate guest holds). Prevents enumerating payments by id.
    const expected = payment.reservation?.confirmationToken;
    if (!expected || !timingSafeEqualString(token, expected)) {
      throw new ApiError(404, "Платеж не найден");
    }
    // Never expose the confirmationToken (it grants access to the reservation).
    return ok({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        reservation: { id: payment.reservation?.id, status: payment.reservation?.status },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
