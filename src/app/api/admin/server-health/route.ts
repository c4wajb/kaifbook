import { handleApiError, requireAdmin, ok } from "@/lib/api";
import { getServerHealth } from "@/lib/server-health";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getServerHealth();
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
