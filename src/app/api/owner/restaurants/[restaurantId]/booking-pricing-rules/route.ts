import { handleApiError, ok, readJson, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { bookingPricingRuleSchema } from "@/lib/validation";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const rules = await prisma.bookingPricingRule.findMany({ where: { restaurantId }, include: { tableType: true, table: true }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }] });
    return ok({ rules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const payload = bookingPricingRuleSchema.parse(await readJson(request));
    const rule = await prisma.bookingPricingRule.create({ data: { ...payload, restaurantId } });
    return ok({ rule }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
