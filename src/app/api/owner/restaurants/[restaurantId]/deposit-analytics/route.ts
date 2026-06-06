import { handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { getNoShowDepositAnalytics } from "@/lib/no-show-analytics";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const analytics = await getNoShowDepositAnalytics(restaurantId);
    return ok({ analytics });
  } catch (error) {
    return handleApiError(error);
  }
}
