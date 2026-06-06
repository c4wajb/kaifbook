import { handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
type C = { params: Promise<{ restaurantId: string }> };
export async function GET(_request: Request, context: C) { try { const { restaurantId } = await context.params; const categories = await prisma.menuCategory.findMany({ where: { restaurantId, isActive: true }, orderBy: { sortOrder: "asc" }, include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } } }); return ok({ categories }); } catch (error) { return handleApiError(error); } }
