import { handleApiError, ok } from "@/lib/api";
import { cancelReservationByToken } from "@/lib/public-reservation-confirmation";

type C = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { token } = await context.params;
    const reservation = await cancelReservationByToken(token);
    return ok({ reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
