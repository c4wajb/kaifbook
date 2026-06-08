import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "@prisma/client";
import { ADMIN_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getSessionSecret } from "@/lib/secrets";

const SESSION_COOKIE = "restaurant_mvp_session";
const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(getSessionSecret());
}

function shouldUseSecureCookie() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  return process.env.NODE_ENV === "production" && publicUrl.startsWith("https://");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function setSessionCookie(user: Pick<User, "id" | "email" | "role">) {
  const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    if (!userId) return null;
    return {
      userId,
      email: typeof payload.email === "string" ? payload.email : "",
      role: typeof payload.role === "string" ? payload.role : "customer",
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: { role: string }) {
  return (ADMIN_ROLES as readonly string[]).includes(user.role);
}

export async function requireOwnedBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({ where: { id: businessId, userId } });
  if (!business) redirect("/businesses?error=Бизнес не найден");
  return business;
}
