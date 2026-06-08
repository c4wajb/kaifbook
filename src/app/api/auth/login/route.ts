import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getClientIp, isRateLimited, MINUTE, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { loginSchema, zodError } from "@/lib/validation";
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodError(parsed.error));
  const email = parsed.data.email.toLowerCase();
  // Throttle brute force: by source IP and by targeted email.
  if (isRateLimited([
    { key: `login:ip:${getClientIp(request)}`, rule: { limit: 15, windowMs: 15 * MINUTE } },
    { key: `login:email:${email}`, rule: { limit: 8, windowMs: 15 * MINUTE } },
  ])) return jsonError(RATE_LIMIT_MESSAGE, 429);
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) return jsonError("Неверный email или пароль", 401);
  await setSessionCookie(user);
  return NextResponse.json({ user: { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, createdAt: user.createdAt } });
}
