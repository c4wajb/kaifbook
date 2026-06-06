import { handleApiError, ok, requireAuth } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { requireReservationManagementAccess } from "@/lib/reservation-access";
import { changeReservationStatus } from "@/lib/reservations";

type C = { params: Promise<{ reservationId: string }> };

export async function PATCH(_request: Request, context: C) {
  try {
    const { reservationId } = await context.params;
    const user = await requireAuth();
    await requireReservationManagementAccess(user, reservationId);
    const reservation = await changeReservationStatus(reservationId, RESERVATION_STATUSES.SEATED, { actorUserId: user.id, actorRole: user.role });
    return ok({ reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
