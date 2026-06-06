import { ApiError, handleApiError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { requireReservationAccess } from "@/lib/reservation-access";
import { changeReservationStatus } from "@/lib/reservations";
type C = { params: Promise<{ reservationId: string }> };
export async function PATCH(_request: Request, context: C) { try { const { reservationId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireReservationAccess(user, reservationId); const reservation = await changeReservationStatus(reservationId, RESERVATION_STATUSES.CANCELLED, { actorUserId: user.id, actorRole: user.role }); return ok({ reservation }); } catch (error) { return handleApiError(error); } }
