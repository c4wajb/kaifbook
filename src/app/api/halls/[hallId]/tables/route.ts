import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireHallAccess } from "@/lib/permissions";
import { tableSchema } from "@/lib/validation";
type C = { params: Promise<{ hallId: string }> };
export async function POST(request: Request, context: C) { try { const { hallId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); const hall = await requireHallAccess(user, hallId); const payload = tableSchema.parse(await readJson(request)); const table = await prisma.restaurantTable.create({ data: { ...payload, hallId, restaurantId: hall.restaurantId } }); return ok({ table }, 201); } catch (error) { return handleApiError(error); } }
