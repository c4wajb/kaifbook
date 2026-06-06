import { handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireHallAccess } from "@/lib/permissions";
import { hallLayoutSchema } from "@/lib/validation";
import type { z } from "zod";

type C = { params: Promise<{ hallId: string }> };
type HallLayoutTable = z.infer<typeof hallLayoutSchema>["tables"][number];
type HallLayoutObject = z.infer<typeof hallLayoutSchema>["objects"][number];

function tableData(table: HallLayoutTable) {
  return {
    number: table.number,
    seats: table.seats,
    tableTypeId: table.tableTypeId || null,
    bookingPrice: table.bookingPrice ?? null,
    depositAmount: table.depositAmount ?? null,
    depositRequired: table.depositRequired ?? null,
    minGuests: table.minGuests ?? null,
    maxGuests: table.maxGuests ?? null,
    shape: table.shape,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation,
    isActive: table.isActive,
  };
}

function objectData(object: HallLayoutObject, restaurantId: string, hallId: string) {
  return {
    restaurantId,
    hallId,
    type: object.type,
    label: object.label,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    shape: object.shape,
    icon: object.icon || null,
    color: object.color || null,
    zIndex: object.zIndex,
    isLocked: object.isLocked,
    isVisible: object.isVisible,
    notes: object.notes || null,
  };
}

export async function PUT(request: Request, context: C) {
  try {
    const { hallId } = await context.params;
    const user = await requireAuth();
    const hall = await requireHallAccess(user, hallId);
    const payload = hallLayoutSchema.parse(await readJson(request));
    const result = await prisma.$transaction(async (tx) => {
      if (payload.hall) await tx.hall.update({ where: { id: hallId }, data: payload.hall });
      const existingTables = await tx.restaurantTable.findMany({ where: { hallId }, select: { id: true } });
      const existingTableIds = new Set(existingTables.map((table) => table.id));
      for (const table of payload.tables) {
        if (table.id && existingTableIds.has(table.id)) await tx.restaurantTable.updateMany({ where: { id: table.id, hallId }, data: tableData(table) });
        else await tx.restaurantTable.create({ data: { ...tableData(table), hallId, restaurantId: hall.restaurantId } });
      }

      const existingObjects = await tx.hallObject.findMany({ where: { hallId }, select: { id: true } });
      const existingObjectIds = new Set(existingObjects.map((object) => object.id));
      const objectIds = payload.objects.map((object) => object.id).filter((id): id is string => Boolean(id && existingObjectIds.has(id)));
      await tx.hallObject.deleteMany({ where: { hallId, ...(objectIds.length ? { id: { notIn: objectIds } } : {}) } });
      for (const object of payload.objects) {
        if (object.id && existingObjectIds.has(object.id)) await tx.hallObject.updateMany({ where: { id: object.id, hallId }, data: objectData(object, hall.restaurantId, hallId) });
        else await tx.hallObject.create({ data: objectData(object, hall.restaurantId, hallId) });
      }

      return tx.hall.findUnique({
        where: { id: hallId },
        include: {
          tables: { include: { tableType: true }, orderBy: [{ y: "asc" }, { x: "asc" }] },
          objects: { orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }] },
        },
      });
    });
    return ok({ hall: result });
  } catch (error) {
    return handleApiError(error);
  }
}
