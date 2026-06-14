import { ApiError } from "@/lib/api";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePhone, phoneAccountEmail } from "@/lib/phone";
import { confirmVerificationCode, resolveConfirmedVerificationSession } from "@/lib/verifications";

export async function verifyGuestMessengerSession(rawPhone: string, verificationSessionId: string, rawCode: string) {
  const phone = normalizePhone(rawPhone);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");
  if (!verificationSessionId) throw new ApiError(400, "Подтверждение через MAX или VK не найдено.");

  await confirmVerificationCode({ sessionId: verificationSessionId, phone, code: rawCode });

  const user = await getOrCreateGuestUser(phone);
  await setSessionCookie(user);
  return user;
}

// Code-free login: used when the session was already confirmed in the chat
// (VK direct confirmation). The session must be confirmed for this phone.
export async function loginGuestByConfirmedSession(rawPhone: string, verificationSessionId: string) {
  const phone = normalizePhone(rawPhone);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");
  if (!verificationSessionId) throw new ApiError(400, "Подтверждение не найдено.");

  const confirmed = await resolveConfirmedVerificationSession(verificationSessionId, phone);
  if (!confirmed) throw new ApiError(400, "Вход ещё не подтверждён. Откройте VK и отправьте команду сообществу.");

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
