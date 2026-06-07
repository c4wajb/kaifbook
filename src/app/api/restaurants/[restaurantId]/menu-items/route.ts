import { revalidateTag } from "next/cache";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { menuItemSchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function POST(request: Request, context: C) { try { const { restaurantId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireRestaurantAccess(user, restaurantId); const p = menuItemSchema.parse(await readJson(request)); const item = await prisma.menuItem.create({ data: { restaurantId, categoryId: p.categoryId || null, title: p.title, description: p.description, price: p.price, weight: p.weight || null, photoUrl: p.photoUrl || null, isAvailable: p.isAvailable, sortOrder: p.sortOrder } }); revalidateTag("restaurant-menu", { expire: 0 }); return ok({ item }, 201); } catch (error) { return handleApiError(error); } }
