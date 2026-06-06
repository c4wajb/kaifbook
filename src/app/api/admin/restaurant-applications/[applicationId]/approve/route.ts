import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { RESTAURANT_STATUSES, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { restaurantDataFromPayload } from "@/lib/restaurant-data";
import { restaurantApplicationApproveSchema } from "@/lib/validation";

type Context = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new ApiError(401, "Требуется авторизация");
    if (currentUser.role !== ROLES.ADMIN && currentUser.role !== ROLES.PLATFORM_ADMIN) {
      throw new ApiError(403, "Недостаточно прав");
    }

    const { applicationId } = await context.params;
    const payload = restaurantApplicationApproveSchema.parse(await readJson(request));
    const application = await prisma.restaurantLead.findUnique({ where: { id: applicationId } });
    if (!application) throw new ApiError(404, "Заявка не найдена");

    if (application.status === "approved" && application.createdRestaurantId && application.createdUserId) {
      return ok({
        application,
        restaurantId: application.createdRestaurantId,
        userId: application.createdUserId,
        ownerEmail: payload.ownerEmail,
        temporaryPassword: null,
      });
    }

    const phoneConflict = await prisma.user.findFirst({
      where: { phone: payload.ownerPhone, email: { not: payload.ownerEmail } },
      select: { id: true },
    });
    const safeOwnerPhone = phoneConflict ? null : payload.ownerPhone;
    const passwordHash = await hashPassword(payload.temporaryPassword);
    const restaurantDraft = await restaurantDataFromPayload({
      title: payload.restaurantName,
      slug: "",
      shortDescription: "Черновик ресторана. Заполните описание перед публикацией.",
      description: "Черновик ресторана. Добавьте описание, фотографии, меню, время работы и схему зала.",
      city: payload.city,
      address: payload.address || application.address || "Адрес не указан",
      phone: payload.ownerPhone,
      email: payload.ownerEmail,
      website: "",
      averageCheck: 1500,
      cuisineTypes: "",
      features: "",
      mainPhotoUrl: "",
      galleryPhotos: "",
      status: RESTAURANT_STATUSES.PENDING,
      isActive: true,
    });

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: payload.ownerEmail } });
      const owner = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              fullName: payload.ownerName,
              phone: safeOwnerPhone ?? existingUser.phone,
              role:
                existingUser.role === ROLES.CUSTOMER || existingUser.role === ROLES.GUEST
                  ? ROLES.RESTAURANT_OWNER
                  : existingUser.role,
            },
          })
        : await tx.user.create({
            data: {
              email: payload.ownerEmail,
              fullName: payload.ownerName,
              phone: safeOwnerPhone,
              role: ROLES.RESTAURANT_OWNER,
              passwordHash,
            },
          });

      const restaurant = await tx.restaurant.create({
        data: {
          ...restaurantDraft,
          ownerId: owner.id,
        },
      });

      const updatedApplication = await tx.restaurantLead.update({
        where: { id: application.id },
        data: {
          status: "approved",
          adminComment: payload.adminComment || application.adminComment,
          approvedAt: new Date(),
          rejectedAt: null,
          createdRestaurantId: restaurant.id,
          createdUserId: owner.id,
        },
      });

      return { owner, restaurant, application: updatedApplication };
    });

    return ok({
      application: result.application,
      restaurant: result.restaurant,
      owner: { id: result.owner.id, email: result.owner.email, fullName: result.owner.fullName },
      temporaryPassword: payload.temporaryPassword,
      message: "Ресторан создан, учётная запись готова",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
