import { handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { startRestaurantVkLink } from "@/lib/verifications";

type C = { params: Promise<{ restaurantId: string }> };

export async function POST(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const link = await startRestaurantVkLink({ restaurantId });
    return ok(link);
  } catch (error) {
    return handleApiError(error);
  }
}
