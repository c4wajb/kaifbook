import { ok, requireAuth } from "@/lib/api";
import { requireReservationManagementAccess } from "@/lib/reservation-access";
import { changeReservationStatus } from "@/lib/reservations";

export async function ownerReservationAction(reservationId: string, status: string, options: { rejectionReason?: string | null } = {}) {
  const user = await requireAuth();
  await requireReservationManagementAccess(user, reservationId);
  const reservation = await changeReservationStatus(reservationId, status, {
    ...options,
    actorUserId: user.id,
    actorRole: user.role,
  });
  return ok({ reservation });
}
