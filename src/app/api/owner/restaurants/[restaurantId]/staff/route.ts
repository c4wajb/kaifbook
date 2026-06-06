import { handleApiError, jsonError, ok, requireOwnerAccess } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const staffAccesses = await prisma.restaurantStaffAccess.findMany({
      where: { restaurantId },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok({ staff: staffAccesses.map((sa) => ({ id: sa.id, role: sa.role, createdAt: sa.createdAt, user: sa.user })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: C) {
  try {
    const { restaurantId } = await context.params;
    await requireOwnerAccess(restaurantId);
    const body = await request.json();
    const { email, fullName, phone, password, role } = body as {
      email?: string;
      fullName?: string;
      phone?: string;
      password?: string;
      role?: string;
    };

    if (!email || !fullName || !password) {
      return jsonError("Укажите email, имя и пароль", 422);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const staffRole = role === ROLES.RESTAURANT_MANAGER ? ROLES.RESTAURANT_MANAGER : ROLES.WAITER;

    let user = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" } } });
    if (user) {
      const existing = await prisma.restaurantStaffAccess.findUnique({
        where: { restaurantId_userId: { restaurantId, userId: user.id } },
      });
      if (existing) return jsonError("Этот сотрудник уже добавлен", 409);
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName,
          phone: phone || null,
          passwordHash: await hashPassword(password),
          role: staffRole,
        },
      });
    }

    const access = await prisma.restaurantStaffAccess.create({
      data: { restaurantId, userId: user.id, role: staffRole },
    });

    return ok({ access, userId: user.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
