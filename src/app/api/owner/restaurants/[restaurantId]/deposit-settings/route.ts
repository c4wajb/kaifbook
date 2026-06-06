import { handleApiError, ok, readJson, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { reservationDepositSettingsSchema } from "@/lib/validation";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const settings = await prisma.reservationDepositSettings.findUnique({ where: { restaurantId } });
    return ok({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const payload = reservationDepositSettingsSchema.parse(await readJson(request));
    const settings = await prisma.reservationDepositSettings.upsert({ where: { restaurantId }, update: payload, create: { restaurantId, ...payload } });
    return ok({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
