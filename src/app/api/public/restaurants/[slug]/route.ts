import { handleApiError, ok } from "@/lib/api";
import { getRestaurantBySlug } from "@/lib/public-data";

type C = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { slug } = await context.params;
    const restaurant = await getRestaurantBySlug(slug);
    return ok({ restaurant });
  } catch (error) {
    return handleApiError(error);
  }
}
