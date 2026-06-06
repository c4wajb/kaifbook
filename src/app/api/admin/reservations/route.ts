import { handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
export async function GET() { try { await requireAdmin(); const reservations = await prisma.reservation.findMany({ include: { restaurant: { select: { id: true, title: true, city: true } }, hall: true, table: true }, orderBy: [{ reservationDate: "desc" }, { startTime: "asc" }] }); return ok({ reservations }); } catch (error) { return handleApiError(error); } }
