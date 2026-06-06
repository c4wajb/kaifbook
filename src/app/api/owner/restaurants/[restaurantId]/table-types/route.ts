import { handleApiError, ok, readJson, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { tableTypeSchema } from "@/lib/validation";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const tableTypes = await prisma.tableType.findMany({ where: { restaurantId }, orderBy: [{ isActive: "desc" }, { maxGuests: "asc" }] });
    return ok({ tableTypes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const payload = tableTypeSchema.parse(await readJson(request));
    const tableType = await prisma.tableType.create({ data: { ...payload, restaurantId } });
    return ok({ tableType }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
