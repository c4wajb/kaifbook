import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireMenuItemAccess } from "@/lib/permissions";
import { menuItemSchema } from "@/lib/validation";
type C = { params: Promise<{ itemId: string }> };
export async function PUT(request: Request, context: C) { try { const { itemId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuItemAccess(user, itemId); const payload = menuItemSchema.partial().parse(await readJson(request)); const item = await prisma.menuItem.update({ where: { id: itemId }, data: { ...payload, categoryId: payload.categoryId === undefined ? undefined : payload.categoryId || null, photoUrl: payload.photoUrl === undefined ? undefined : payload.photoUrl || null, weight: payload.weight === undefined ? undefined : payload.weight || null } }); return ok({ item }); } catch (error) { return handleApiError(error); } }
export async function DELETE(_request: Request, context: C) { try { const { itemId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuItemAccess(user, itemId); const item = await prisma.menuItem.update({ where: { id: itemId }, data: { isAvailable: false } }); return ok({ item }); } catch (error) { return handleApiError(error); } }
