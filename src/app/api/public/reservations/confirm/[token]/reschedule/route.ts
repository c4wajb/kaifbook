import { handleApiError, ok, readJson } from "@/lib/api";
import { reservationRescheduleSchema, rescheduleReservationByToken } from "@/lib/public-reservation-confirmation";

type C = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: C) {
  try {
    const { token } = await context.params;
    const payload = reservationRescheduleSchema.parse(await readJson(request));
    const reservation = await rescheduleReservationByToken(token, payload);
    return ok({ reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
