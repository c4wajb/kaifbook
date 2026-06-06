import { handleApiError } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { ownerReservationAction } from "@/lib/owner-reservation-action";

type C = { params: Promise<{ reservationId: string }> };

export async function PATCH(_request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    return await ownerReservationAction(reservationId, RESERVATION_STATUSES.CONFIRMED);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = PATCH;
