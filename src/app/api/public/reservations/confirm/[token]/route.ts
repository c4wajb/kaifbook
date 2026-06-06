import { handleApiError, ok } from "@/lib/api";
import { getReservationByConfirmationToken } from "@/lib/public-reservation-confirmation";

type C = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { token } = await context.params;
    const reservation = await getReservationByConfirmationToken(token);
    return ok({ reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
