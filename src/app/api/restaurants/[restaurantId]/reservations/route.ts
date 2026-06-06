import { handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createReservation } from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function POST(request: Request, context: C) { try { const { restaurantId } = await context.params; const currentUser = await getCurrentUser(); const payload = reservationSchema.parse(await readJson(request)); const reservation = await createReservation(restaurantId, payload, currentUser?.id); return ok({ reservation, message: "Заявка отправлена. Ресторан подтвердит стол и свяжется с вами." }, 201); } catch (error) { return handleApiError(error); } }
