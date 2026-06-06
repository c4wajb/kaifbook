import { handleApiError, ok } from "@/lib/api";
import { getPublicRestaurants } from "@/lib/public-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurants = await getPublicRestaurants({
      q: searchParams.get("q") || undefined,
      city: searchParams.get("city") || undefined,
      cuisine: searchParams.get("cuisine") || undefined,
      feature: searchParams.get("feature") || undefined,
      averageCheck: searchParams.get("averageCheck") || undefined,
    });
    return ok({ restaurants });
  } catch (error) {
    return handleApiError(error);
  }
}
