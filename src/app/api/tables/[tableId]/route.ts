import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireTableAccess } from "@/lib/permissions";
import { tableSchema } from "@/lib/validation";
type C = { params: Promise<{ tableId: string }> };
export async function PUT(request: Request, context: C) { try { const { tableId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireTableAccess(user, tableId); const payload = tableSchema.partial().parse(await readJson(request)); const table = await prisma.restaurantTable.update({ where: { id: tableId }, data: payload }); return ok({ table }); } catch (error) { return handleApiError(error); } }
export async function DELETE(_request: Request, context: C) { try { const { tableId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireTableAccess(user, tableId); const table = await prisma.restaurantTable.update({ where: { id: tableId }, data: { isActive: false } }); return ok({ table }); } catch (error) { return handleApiError(error); } }
