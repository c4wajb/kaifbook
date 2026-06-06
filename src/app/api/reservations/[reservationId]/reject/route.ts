import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { requireReservationManagementAccess } from "@/lib/reservation-access";
import { changeReservationStatus } from "@/lib/reservations";
import { rejectReservationSchema } from "@/lib/validation";
type C = { params: Promise<{ reservationId: string }> };
export async function PATCH(request: Request, context: C) { try { const { reservationId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireReservationManagementAccess(user, reservationId); const payload = rejectReservationSchema.parse(await readJson(request)); const reservation = await changeReservationStatus(reservationId, RESERVATION_STATUSES.REJECTED, { rejectionReason: payload.rejectionReason, actorUserId: user.id, actorRole: user.role }); return ok({ reservation }); } catch (error) { return handleApiError(error); } }
