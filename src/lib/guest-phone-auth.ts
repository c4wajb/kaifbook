import { ApiError } from "@/lib/api";
import { hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePhone, phoneAccountEmail } from "@/lib/phone";
import { confirmVerificationCode } from "@/lib/verifications";

const CODE_TTL_MINUTES = 10;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function createCode() {
  if (process.env.SMS_DEMO_CODE) return process.env.SMS_DEMO_CODE.replace(/\D/g, "").slice(0, 6).padStart(6, "0");
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isDemoSmsMode() {
  return process.env.SMS_PROVIDER !== "real";
}

export async function requestGuestPhoneCode(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");

  const code = createCode();
  await prisma.phoneLoginCode.create({
    data: {
      phone,
      codeHash: await hashPassword(code),
      expiresAt: addMinutes(new Date(), CODE_TTL_MINUTES),
    },
  });

  await prisma.phoneLoginCode.deleteMany({
    where: {
      phone,
      OR: [
        { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } },
        { consumedAt: { not: null } },
      ],
    },
  });

  if (isDemoSmsMode()) {
    console.info("[Kaifbook:guest-login] demo SMS code", { phone, code });
  }

  return {
    phone,
    expiresInMinutes: CODE_TTL_MINUTES,
    demoCode: isDemoSmsMode() ? code : null,
  };
}

export async function verifyGuestPhoneCode(rawPhone: string, rawCode: string) {
  const phone = normalizePhone(rawPhone);
  const code = rawCode.replace(/\D/g, "");
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");
  if (code.length !== 6) throw new ApiError(400, "Введите код из СМС.");

  const loginCode = await prisma.phoneLoginCode.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!loginCode || !(await verifyPassword(code, loginCode.codeHash))) {
    throw new ApiError(400, "Код не подошел или уже истек. Запросите новый код.");
  }

  await prisma.phoneLoginCode.update({
    where: { id: loginCode.id },
    data: { consumedAt: new Date() },
  });

  const user = await getOrCreateGuestUser(phone);
  await setSessionCookie(user);
  return user;
}

export async function verifyGuestMessengerSession(rawPhone: string, verificationSessionId: string, rawCode: string) {
  const phone = normalizePhone(rawPhone);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");
  if (!verificationSessionId) throw new ApiError(400, "Подтверждение через MAX или VK не найдено.");

  await confirmVerificationCode({ sessionId: verificationSessionId, phone, code: rawCode });

  const user = await getOrCreateGuestUser(phone);
  await setSessionCookie(user);
  return user;
}

export async function getOrCreateGuestUser(phone: string) {
  const existingByPhone = await prisma.user.findFirst({
    where: { phone, role: "customer", isActive: true },
    select: { id: true, email: true, role: true, fullName: true, phone: true },
  });
  if (existingByPhone) return existingByPhone;

  const email = phoneAccountEmail(phone);
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, fullName: true, phone: true },
  });
  if (existingByEmail) {
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { phone, role: "customer", isActive: true },
      select: { id: true, email: true, role: true, fullName: true, phone: true },
    });
    return updated;
  }

  return prisma.user.create({
    data: {
      email,
      phone,
      fullName: "Гость Kaifbook",
      passwordHash: await hashPassword(crypto.randomUUID()),
      role: "customer",
      isActive: true,
    },
    select: { id: true, email: true, role: true, fullName: true, phone: true },
  });
}
