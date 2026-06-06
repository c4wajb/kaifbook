import { ApiError, handleApiError, ok, readJson, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
import { restaurantApplicationStatusSchema } from "@/lib/validation";

type Context = { params: Promise<{ applicationId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();

    const { applicationId } = await context.params;
    const payload = restaurantApplicationStatusSchema.parse(await readJson(request));
    const existing = await prisma.restaurantLead.findUnique({ where: { id: applicationId } });
    if (!existing) throw new ApiError(404, "Заявка не найдена");

    const application = await prisma.restaurantLead.update({
      where: { id: applicationId },
      data: {
        status: payload.status,
        adminComment: payload.adminComment || existing.adminComment,
        approvedAt: payload.status === "approved" ? new Date() : existing.approvedAt,
        rejectedAt: payload.status === "rejected" ? new Date() : existing.rejectedAt,
      },
    });

    return ok({ application });
  } catch (error) {
    return handleApiError(error);
  }
}
