import { ApiError, handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireAdmin();

    const { applicationId } = await context.params;
    const application = await prisma.restaurantLead.findUnique({ where: { id: applicationId } });
    if (!application) throw new ApiError(404, "Заявка не найдена");

    return ok({ application });
  } catch (error) {
    return handleApiError(error);
  }
}
