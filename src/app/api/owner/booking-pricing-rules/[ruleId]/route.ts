import { ApiError, handleApiError, ok, readJson, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canManageRestaurant } from "@/lib/permissions";
import { bookingPricingRuleSchema } from "@/lib/validation";

type C = { params: Promise<{ ruleId: string }> };

async function requireAccess(ruleId: string) {
  const user = await requireAuth();
  const rule = await prisma.bookingPricingRule.findUnique({ where: { id: ruleId }, include: { restaurant: true } });
  if (!rule || !canManageRestaurant(user, rule.restaurant)) throw new ApiError(403, "Access denied");
  return rule;
}

export async function PUT(request: Request, context: C) {
  try {
    const { ruleId } = await context.params;
    await requireAccess(ruleId);
    const payload = bookingPricingRuleSchema.parse(await readJson(request));
    const rule = await prisma.bookingPricingRule.update({ where: { id: ruleId }, data: payload });
    return ok({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: C) {
  try {
    const { ruleId } = await context.params;
    await requireAccess(ruleId);
    const rule = await prisma.bookingPricingRule.update({ where: { id: ruleId }, data: { isActive: false } });
    return ok({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}
