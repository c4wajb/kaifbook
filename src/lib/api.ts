import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessRestaurant, canManageRestaurant } from "@/lib/permissions";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return jsonError(error.message, error.status);
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || "Проверьте данные в форме.", details: error.issues }, { status: 422 });
  }
  return jsonError("Не удалось выполнить запрос. Попробуйте позже.", 500);
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: jsonError("Требуется авторизация", 401) };
  return { user, response: null };
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// --- Auth middleware helpers ---

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Require authenticated user, throw ApiError(401) if not logged in. */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required");
  return user;
}

/** Require admin role, throw ApiError(403) if not admin. */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!isAdmin(user)) throw new ApiError(403, "Access denied");
  return user;
}

/** Require authenticated user with management access to the restaurant. Returns { user, restaurant }. */
export async function requireOwnerAccess(restaurantId: string) {
  const user = await requireAuth();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) throw new ApiError(403, "Access denied");
  return { user, restaurant };
}

/** Require authenticated user with staff or owner access to the restaurant. Returns { user, restaurant }. */
export async function requireStaffOrOwnerAccess(restaurantId: string) {
  const user = await requireAuth();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) throw new ApiError(403, "Access denied");
  return { user, restaurant };
}
