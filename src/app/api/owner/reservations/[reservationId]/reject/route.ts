import { handleApiError, readJson } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { ownerReservationAction } from "@/lib/owner-reservation-action";
import { rejectReservationSchema } from "@/lib/validation";

type C = { params: Promise<{ reservationId: string }> };

export async function PATCH(request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    const payload = rejectReservationSchema.parse(await readJson(request).catch(() => ({})));
    return await ownerReservationAction(reservationId, RESERVATION_STATUSES.REJECTED, payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = PATCH;
