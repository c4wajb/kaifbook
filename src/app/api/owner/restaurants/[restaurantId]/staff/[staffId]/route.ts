import { ApiError, handleApiError, ok, requireOwnerAccess } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string; staffId: string }> };

const STAFF_LEVEL_ROLES: string[] = [ROLES.CUSTOMER, ROLES.WAITER, ROLES.RESTAURANT_MANAGER, ROLES.RESTAURANT_STAFF];

export async function PATCH(request: Request, context: C) {
  try {
    const { restaurantId, staffId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const access = await prisma.restaurantStaffAccess.findFirst({ where: { id: staffId, restaurantId }, include: { user: true } });
    if (!access) throw new ApiError(404, "Сотрудник не найден");

    const body = await request.json();
    const { fullName, phone, role, password } = body as { fullName?: string; phone?: string; role?: string; password?: string };

    const nextRole = role === ROLES.RESTAURANT_MANAGER ? ROLES.RESTAURANT_MANAGER : role === ROLES.WAITER ? ROLES.WAITER : access.role;

    const userData: { fullName?: string; phone?: string | null; passwordHash?: string; role?: string } = {};
    if (typeof fullName === "string" && fullName.trim()) userData.fullName = fullName.trim();
    if (typeof phone === "string") userData.phone = phone.trim() || null;
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 6) throw new ApiError(422, "Пароль должен быть не короче 6 символов");
      userData.passwordHash = await hashPassword(password);
    }
    // Keep the user's global role in sync only when they're a staff-level account,
    // so we never accidentally downgrade an owner/admin who also waits tables.
    if (role && STAFF_LEVEL_ROLES.includes(access.user.role)) userData.role = nextRole;

    if (nextRole !== access.role) {
      await prisma.restaurantStaffAccess.update({ where: { id: staffId }, data: { role: nextRole } });
    }
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: access.user.id }, data: userData });
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: C) {
  try {
    const { restaurantId, staffId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const access = await prisma.restaurantStaffAccess.findFirst({ where: { id: staffId, restaurantId } });
    if (!access) throw new ApiError(404, "Сотрудник не найден");
    await prisma.restaurantStaffAccess.delete({ where: { id: staffId } });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
