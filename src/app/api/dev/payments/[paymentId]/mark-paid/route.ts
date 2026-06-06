import { ApiError, handleApiError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { markPaymentPaid } from "@/lib/payments";

type C = { params: Promise<{ paymentId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    if (process.env.NODE_ENV === "production") {
      const user = await getCurrentUser();
      if (!user || user.role !== ROLES.ADMIN) throw new ApiError(403, "Mock-оплата недоступна");
    }
    const { paymentId } = await context.params;
    const payment = await markPaymentPaid(paymentId);
    return ok({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
