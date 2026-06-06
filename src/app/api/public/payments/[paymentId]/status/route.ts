import { ApiError, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ paymentId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { paymentId } = await context.params;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: { select: { id: true, status: true, confirmationToken: true } } },
    });
    if (!payment) throw new ApiError(404, "Платеж не найден");
    return ok({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
