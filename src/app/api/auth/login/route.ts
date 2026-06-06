import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loginSchema, zodError } from "@/lib/validation";
export async function POST(request: Request) { const body = await readJson(request); const parsed = loginSchema.safeParse(body); if (!parsed.success) return jsonError(zodError(parsed.error)); const user = await prisma.user.findUnique({ where: { email: parsed.data.email } }); if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) return jsonError("Неверный email или пароль", 401); await setSessionCookie(user); return NextResponse.json({ user: { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, createdAt: user.createdAt } }); }
