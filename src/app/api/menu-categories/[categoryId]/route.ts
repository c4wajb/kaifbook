import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireMenuCategoryAccess } from "@/lib/permissions";
import { menuCategorySchema } from "@/lib/validation";
type C = { params: Promise<{ categoryId: string }> };
export async function PUT(request: Request, context: C) { try { const { categoryId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuCategoryAccess(user, categoryId); const payload = menuCategorySchema.partial().parse(await readJson(request)); const category = await prisma.menuCategory.update({ where: { id: categoryId }, data: payload }); return ok({ category }); } catch (error) { return handleApiError(error); } }
export async function DELETE(_request: Request, context: C) { try { const { categoryId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuCategoryAccess(user, categoryId); const category = await prisma.menuCategory.update({ where: { id: categoryId }, data: { isActive: false } }); return ok({ category }); } catch (error) { return handleApiError(error); } }
