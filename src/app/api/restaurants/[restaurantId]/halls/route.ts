import { handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/permissions";
import { hallSchema } from "@/lib/validation";
type C = { params: Promise<{ restaurantId: string }> };
export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    const halls = await prisma.hall.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        tables: { where: { isActive: true }, orderBy: [{ y: "asc" }, { x: "asc" }] },
        objects: { orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }] },
      },
    });
    return ok({ halls });
  } catch (error) {
    return handleApiError(error);
  }
}
export async function POST(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    const user = await requireAuth();
    await requireRestaurantAccess(user, restaurantId);
    const payload = hallSchema.parse(await readJson(request));
    const hall = await prisma.hall.create({ data: { restaurantId, ...payload }, include: { tables: true, objects: true } });
    return ok({ hall }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
