import { ApiError, handleApiError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { dateFromInput } from "@/lib/time";
type C = { params: Promise<{ restaurantId: string }> };
export async function GET(request: Request, context: C) { try { const { restaurantId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireRestaurantAccess(user, restaurantId); const { searchParams } = new URL(request.url); const status = searchParams.get("status") || undefined; const date = searchParams.get("date") || undefined; const reservations = await prisma.reservation.findMany({ where: { restaurantId, status, reservationDate: date ? dateFromInput(date) : undefined }, include: { hall: true, table: true }, orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }] }); return ok({ reservations }); } catch (error) { return handleApiError(error); } }
