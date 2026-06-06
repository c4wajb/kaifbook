import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { workingHoursSchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function GET(_request: Request, context: C) { try { const { restaurantId } = await context.params; const workingHours = await prisma.restaurantWorkingHour.findMany({ where: { restaurantId }, orderBy: { dayOfWeek: "asc" } }); return ok({ workingHours }); } catch (error) { return handleApiError(error); } }
export async function PUT(request: Request, context: C) { try { const { restaurantId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireRestaurantAccess(user, restaurantId); const payload = workingHoursSchema.parse(await readJson(request)); const workingHours = await prisma.$transaction(payload.workingHours.map((item) => prisma.restaurantWorkingHour.upsert({ where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek: item.dayOfWeek } }, create: { restaurantId, dayOfWeek: item.dayOfWeek, openTime: item.openTime, closeTime: item.closeTime, isClosed: item.isClosed }, update: { openTime: item.openTime, closeTime: item.closeTime, isClosed: item.isClosed } }))); return ok({ workingHours }); } catch (error) { return handleApiError(error); } }
