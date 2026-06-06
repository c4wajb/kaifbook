import { handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { requireReservationManagementAccess } from "@/lib/reservation-access";
import { markReservationPaymentPaid } from "@/lib/reservations";

type C = { params: Promise<{ reservationId: string }> };

export async function POST(request: Request, context: C) {
  try {
    const user = await requireAuth();
    const { reservationId } = await context.params;
    await requireReservationManagementAccess(user, reservationId);
    const body = await readJson(request);
    const comment = body && typeof body.comment === "string" ? body.comment : null;
    const reservation = await markReservationPaymentPaid(reservationId, user, comment);
    return ok({ reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
