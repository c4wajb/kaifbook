import { ApiError, handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canManageRestaurant } from "@/lib/permissions";
import { tableTypeSchema } from "@/lib/validation";

type C = { params: Promise<{ tableTypeId: string }> };

async function requireAccess(tableTypeId: string) {
  const user = await requireAuth();
  const tableType = await prisma.tableType.findUnique({ where: { id: tableTypeId }, include: { restaurant: true } });
  if (!tableType || !canManageRestaurant(user, tableType.restaurant)) throw new ApiError(403, "Access denied");
  return tableType;
}

export async function PUT(request: Request, context: C) {
  try {
    const { tableTypeId } = await context.params;
    await requireAccess(tableTypeId);
    const payload = tableTypeSchema.parse(await readJson(request));
    const tableType = await prisma.tableType.update({ where: { id: tableTypeId }, data: payload });
    return ok({ tableType });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: C) {
  try {
    const { tableTypeId } = await context.params;
    await requireAccess(tableTypeId);
    const tableType = await prisma.tableType.update({ where: { id: tableTypeId }, data: { isActive: false } });
    return ok({ tableType });
  } catch (error) {
    return handleApiError(error);
  }
}
