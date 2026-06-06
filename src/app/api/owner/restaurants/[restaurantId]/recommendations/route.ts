import { handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { getRestaurantAnalytics } from "@/lib/owner-analytics";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const analytics = await getRestaurantAnalytics(restaurantId);
    return ok({ recommendations: analytics.recommendations });
  } catch (error) {
    return handleApiError(error);
  }
}
