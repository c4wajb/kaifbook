import { revalidateTag } from "next/cache";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { menuCategorySchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function POST(request: Request, context: C) { try { const { restaurantId } = await context.params; const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Authentication required"); await requireRestaurantAccess(user, restaurantId); const payload = menuCategorySchema.parse(await readJson(request)); const category = await prisma.menuCategory.create({ data: { restaurantId, ...payload } }); revalidateTag("restaurant-menu", { expire: 0 }); return ok({ category }, 201); } catch (error) { return handleApiError(error); } }
