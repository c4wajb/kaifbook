import { handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const status = new URL(request.url).searchParams.get("status") || undefined;
    const reservations = await prisma.reservation.findMany({ where: { restaurantId, status }, include: { guest: true, hall: true, table: true }, orderBy: [{ reservationDate: "desc" }, { startTime: "asc" }] });
    return ok({ reservations });
  } catch (error) {
    return handleApiError(error);
  }
}
