import { revalidateTag } from "next/cache";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireMenuItemAccess } from "@/lib/permissions";
import { menuItemSchema } from "@/lib/validation";
type C = { params: Promise<{ itemId: string }> };
export async function PUT(request: Request, context: C) { try { const { itemId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuItemAccess(user, itemId); const raw = await readJson(request) as Record<string, unknown>; const parsed = menuItemSchema.partial().parse(raw); const data: Record<string, unknown> = {}; for (const key of Object.keys(raw)) { if (key in parsed) data[key] = (parsed as Record<string, unknown>)[key]; } if ("categoryId" in data) data.categoryId = data.categoryId || null; if ("photoUrl" in data) data.photoUrl = data.photoUrl || null; if ("weight" in data) data.weight = data.weight || null; const item = await prisma.menuItem.update({ where: { id: itemId }, data }); revalidateTag("restaurant-menu", { expire: 0 }); return ok({ item }); } catch (error) { return handleApiError(error); } }
export async function DELETE(_request: Request, context: C) { try { const { itemId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireMenuItemAccess(user, itemId); await prisma.menuItem.delete({ where: { id: itemId } }); revalidateTag("restaurant-menu", { expire: 0 }); return ok({ deleted: true }); } catch (error) { return handleApiError(error); } }
