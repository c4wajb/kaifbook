import { ApiError, handleApiError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireReservationAccess } from "@/lib/reservation-access";
type C = { params: Promise<{ reservationId: string }> };
export async function GET(_request: Request, context: C) { try { const { reservationId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); const reservation = await requireReservationAccess(user, reservationId); return ok({ reservation }); } catch (error) { return handleApiError(error); } }
