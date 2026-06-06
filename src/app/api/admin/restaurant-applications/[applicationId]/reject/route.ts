import { ApiError, handleApiError, ok, readJson, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
import { restaurantApplicationRejectSchema } from "@/lib/validation";

type Context = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin();

    const { applicationId } = await context.params;
    const payload = restaurantApplicationRejectSchema.parse(await readJson(request));
    const application = await prisma.restaurantLead.findUnique({ where: { id: applicationId } });
    if (!application) throw new ApiError(404, "Заявка не найдена");

    const updated = await prisma.restaurantLead.update({
      where: { id: application.id },
      data: {
        status: "rejected",
        adminComment: payload.reason || application.adminComment,
        rejectedAt: new Date(),
      },
    });

    return ok({ application: updated, message: "Заявка отклонена" });
  } catch (error) {
    return handleApiError(error);
  }
}
