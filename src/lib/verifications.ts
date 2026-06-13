import { ApiError } from "@/lib/api";
import type { VerificationSession } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { VERIFICATION_PROVIDER_LABELS, VERIFICATION_PROVIDERS, VERIFICATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export type VerificationProvider = (typeof VERIFICATION_PROVIDERS)[keyof typeof VERIFICATION_PROVIDERS];

const SESSION_TTL_MINUTES = 10;
const PHONE_LIMIT_WINDOW_MINUTES = 10;
const DEFAULT_PHONE_LIMIT_COUNT = 8;
const DEFAULT_IP_LIMIT_COUNT = 30;
const MESSENGER_CODE_ATTEMPT_LIMIT = 5;
const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_CODE_LENGTH = 4;
const PUBLIC_CODE_GENERATION_ATTEMPTS = 30;

type ExternalIdentity = {
  externalUserId?: string | null;
  externalChatId?: string | null;
  externalUsername?: string | null;
  contactPhoneFromProvider?: string | null;
};

export function isVerificationProvider(value: unknown): value is VerificationProvider {
  return value === VERIFICATION_PROVIDERS.MAX || value === VERIFICATION_PROVIDERS.VK;
}

export function verificationProviderLabel(provider?: string | null) {
  return provider ? VERIFICATION_PROVIDER_LABELS[provider] || provider.toUpperCase() : "";
}

export function verificationBadgeLabel(provider?: string | null, status?: string | null) {
  if (status === VERIFICATION_STATUSES.CONFIRMED && provider) return `Подтверждено через ${verificationProviderLabel(provider)}`;
  if (status === VERIFICATION_STATUSES.PENDING && provider) return `Ожидает ${verificationProviderLabel(provider)}`;
  return "Без подтверждения";
}

function appPublicUrl() {
  return (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function envPositiveInt(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function phoneLimitCount() {
  return envPositiveInt("VERIFICATION_PHONE_LIMIT_COUNT", DEFAULT_PHONE_LIMIT_COUNT);
}

function ipLimitCount() {
  return envPositiveInt("VERIFICATION_IP_LIMIT_COUNT", DEFAULT_IP_LIMIT_COUNT);
}

function generateVerificationToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function generatePublicCode() {
  const bytes = new Uint8Array(PUBLIC_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length]).join("");
}

async function generateUniquePublicCode() {
  for (let attempt = 0; attempt < PUBLIC_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const publicCode = generatePublicCode();
    const existing = await prisma.verificationSession.findUnique({ where: { publicCode } });
    if (!existing) return publicCode;
  }
  throw new ApiError(500, "Не удалось создать код подтверждения. Попробуйте ещё раз.");
}

function normalizePublicCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function generateMessengerCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function normalizeMessengerCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function maskVerificationToken(token: string) {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export function buildProviderConfirmUrl(provider: VerificationProvider, publicCode: string) {
  if (provider === VERIFICATION_PROVIDERS.MAX) {
    const username = process.env.MAX_BOT_USERNAME?.trim();
    if (username) return `https://max.ru/${encodeURIComponent(username)}?start=${encodeURIComponent(publicCode)}`;
    return `https://max.ru/?start=${encodeURIComponent(publicCode)}`;
  }

  const groupId = process.env.VK_GROUP_ID?.trim();
  const screenName = process.env.VK_GROUP_SCREEN_NAME?.trim();
  if (groupId) return `https://vk.com/im?sel=-${encodeURIComponent(groupId)}&ref=${encodeURIComponent(publicCode)}`;
  if (screenName) return `https://vk.com/${encodeURIComponent(screenName)}?ref=${encodeURIComponent(publicCode)}`;
  return `https://vk.com/im?ref=${encodeURIComponent(publicCode)}`;
}

// Deep link that opens the messenger APP on mobile (and the web messenger on
// desktop). vk.me is VK's "open in messenger" domain — it launches the VK app
// when installed instead of the website.
export function buildProviderAppUrl(provider: VerificationProvider, publicCode: string) {
  if (provider === VERIFICATION_PROVIDERS.MAX) {
    const username = process.env.MAX_BOT_USERNAME?.trim();
    if (username) return `https://max.ru/${encodeURIComponent(username)}?start=${encodeURIComponent(publicCode)}`;
    return `https://max.ru/?start=${encodeURIComponent(publicCode)}`;
  }
  const screenName = process.env.VK_GROUP_SCREEN_NAME?.trim();
  const groupId = process.env.VK_GROUP_ID?.trim();
  if (screenName) return `https://vk.me/${encodeURIComponent(screenName)}`;
  if (groupId) return `https://vk.me/club${encodeURIComponent(groupId)}`;
  return "https://vk.me/";
}

function startCommand(publicCode: string) {
  return `Получить код Kaifbook ${publicCode}`;
}

function codeMessage(provider: VerificationProvider, code: string) {
  return `Kaifbook: код для входа и подтверждения брони — ${code}. Он действует ${SESSION_TTL_MINUTES} минут. Введите код на сайте.`;
}

export async function startVerificationSession(input: {
  provider: string;
  phone: string;
  guestName?: string | null;
  restaurantId?: string | null;
  bookingDraftId?: string | null;
  ipAddress?: string | null;
}) {
  if (!isVerificationProvider(input.provider)) throw new ApiError(400, "Выберите MAX или VK для подтверждения.");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ApiError(400, "Введите корректный номер телефона.");

  const now = new Date();
  const method = input.provider === VERIFICATION_PROVIDERS.MAX ? "max_chat" : "vk_chat";

  await prisma.verificationSession.updateMany({
    where: { phone, provider: input.provider, status: VERIFICATION_STATUSES.PENDING, expiresAt: { lt: now } },
    data: { status: VERIFICATION_STATUSES.EXPIRED },
  });

  const activeSession = await prisma.verificationSession.findFirst({
    where: {
      phone,
      provider: input.provider,
      method,
      status: VERIFICATION_STATUSES.PENDING,
      expiresAt: { gt: now },
      publicCode: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeSession?.publicCode) {
    return {
      id: activeSession.id,
      provider: activeSession.provider,
      status: activeSession.status,
      expiresAt: activeSession.expiresAt,
      confirmUrl: buildProviderConfirmUrl(input.provider, activeSession.publicCode),
      appUrl: buildProviderAppUrl(input.provider, activeSession.publicCode),
      commandText: startCommand(activeSession.publicCode),
      publicCode: activeSession.publicCode,
    };
  }

  const since = addMinutes(now, -PHONE_LIMIT_WINDOW_MINUTES);
  const [phoneStarts, ipStarts] = await Promise.all([
    prisma.verificationSession.count({
      where: {
        phone,
        provider: input.provider,
        method,
        status: VERIFICATION_STATUSES.PENDING,
        createdAt: { gte: since },
      },
    }),
    input.ipAddress
      ? prisma.verificationSession.count({
          where: {
            ipAddress: input.ipAddress,
            provider: { in: [VERIFICATION_PROVIDERS.MAX, VERIFICATION_PROVIDERS.VK] },
            method: { in: ["max_chat", "vk_chat"] },
            status: VERIFICATION_STATUSES.PENDING,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ]);

  if (phoneStarts >= phoneLimitCount()) throw new ApiError(429, "Слишком много попыток. Попробуйте подтвердить заявку позже.");
  if (ipStarts >= ipLimitCount()) throw new ApiError(429, "Слишком много попыток с этого устройства. Попробуйте позже.");

  const token = generateVerificationToken();
  const publicCode = await generateUniquePublicCode();
  const session = await prisma.verificationSession.create({
    data: {
      provider: input.provider,
      method,
      status: VERIFICATION_STATUSES.PENDING,
      phone,
      guestName: input.guestName?.trim() || null,
      restaurantId: input.restaurantId || null,
      bookingDraftId: input.bookingDraftId || null,
      token,
      publicCode,
      ipAddress: input.ipAddress || null,
      expiresAt: addMinutes(now, SESSION_TTL_MINUTES),
      codeExpiresAt: addMinutes(now, SESSION_TTL_MINUTES),
    },
  });

  return {
    id: session.id,
    provider: session.provider,
    status: session.status,
    expiresAt: session.expiresAt,
    confirmUrl: buildProviderConfirmUrl(input.provider, publicCode),
    appUrl: buildProviderAppUrl(input.provider, publicCode),
    commandText: startCommand(publicCode),
    publicCode,
  };
}

export async function getVerificationSessionStatus(id: string) {
  const session = await prisma.verificationSession.findUnique({ where: { id } });
  if (!session) throw new ApiError(404, "Подтверждение не найдено.");
  if (session.status === VERIFICATION_STATUSES.PENDING && session.expiresAt.getTime() < Date.now()) {
    return prisma.verificationSession.update({ where: { id }, data: { status: VERIFICATION_STATUSES.EXPIRED } });
  }
  return session;
}

export async function resolveConfirmedVerificationSession(sessionId: string | null | undefined, phone: string) {
  if (!sessionId) return null;
  const session = await prisma.verificationSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  if (session.status === VERIFICATION_STATUSES.PENDING && session.expiresAt.getTime() < Date.now()) {
    await prisma.verificationSession.update({ where: { id: session.id }, data: { status: VERIFICATION_STATUSES.EXPIRED } });
    return null;
  }
  if (session.status !== VERIFICATION_STATUSES.CONFIRMED) return null;
  if (session.phone !== normalizePhone(phone)) return null;

  return {
    id: session.id,
    provider: session.provider,
    status: session.status,
    externalUserId: session.externalUserId,
    externalChatId: session.externalChatId,
    externalUsername: session.externalUsername,
    contactPhoneFromProvider: session.contactPhoneFromProvider,
    contactPhoneMatched: session.contactPhoneMatched,
  };
}

function collectStrings(value: unknown, output: string[] = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return output;
  }
  Object.values(value as Record<string, unknown>).forEach((item) => collectStrings(item, output));
  return output;
}

export function extractTokenCandidates(payload: unknown) {
  const candidates = new Set<string>();
  for (const text of collectStrings(payload)) {
    const parsedText = text.trim();
    if (!parsedText) continue;
    try {
      const parsedJson = JSON.parse(parsedText);
      collectStrings(parsedJson).forEach((item) => candidates.add(item));
    } catch {
      // plain text is expected for messenger messages
    }
    const matches = parsedText.match(/[A-Za-z0-9_-]{24,}/g) || [];
    matches.forEach((match) => candidates.add(match));
  }
  return Array.from(candidates);
}

export function extractPublicCodeCandidates(payload: unknown) {
  const candidates = new Set<string>();
  for (const text of collectStrings(payload)) {
    const parsedText = text.trim();
    if (!parsedText) continue;
    const commandMatches = parsedText.matchAll(/(?:получить\s+код\s+kaifbook|kaifbook|код)\s+([a-z0-9]{4,8})/giu);
    for (const match of commandMatches) {
      const code = normalizePublicCode(match[1] || "");
      if (code.length >= PUBLIC_CODE_LENGTH) candidates.add(code);
    }
    if (/^[a-z0-9]{4,8}$/i.test(parsedText)) {
      candidates.add(normalizePublicCode(parsedText));
    }
  }
  return Array.from(candidates);
}

function firstStringByKeys(payload: unknown, keys: string[]): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const value = firstStringByKeys(item, keys);
      if (value) return value;
    }
    return null;
  }
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  for (const value of Object.values(record)) {
    const nested = firstStringByKeys(value, keys);
    if (nested) return nested;
  }
  return null;
}

export function extractExternalIdentity(provider: VerificationProvider, payload: unknown): ExternalIdentity {
  const userKeys = provider === VERIFICATION_PROVIDERS.VK ? ["from_id", "user_id", "sender_id", "id"] : ["user_id", "userId", "sender_id", "senderId", "from_id", "id"];
  const chatKeys = provider === VERIFICATION_PROVIDERS.VK ? ["peer_id", "chat_id", "conversation_message_id"] : ["chat_id", "chatId", "dialog_id", "peer_id", "recipient_id"];
  const usernameKeys = ["username", "screen_name", "first_name", "name", "full_name"];
  const phoneKeys = ["phone", "contact_phone", "contactPhone", "phone_number"];

  const contactPhone = firstStringByKeys(payload, phoneKeys);
  return {
    externalUserId: firstStringByKeys(payload, userKeys),
    externalChatId: firstStringByKeys(payload, chatKeys) || firstStringByKeys(payload, userKeys),
    externalUsername: firstStringByKeys(payload, usernameKeys),
    contactPhoneFromProvider: contactPhone ? normalizePhone(contactPhone) : null,
  };
}

export async function confirmVerificationFromPayload(provider: VerificationProvider, payload: unknown) {
  const candidates = extractTokenCandidates(payload);
  if (!candidates.length) return null;

  for (const token of candidates) {
    const identity = extractExternalIdentity(provider, payload);
    const session = await confirmVerificationByToken(provider, token, identity);
    if (session) return session;
  }

  return null;
}

export async function issueVerificationCodeFromPayload(provider: VerificationProvider, payload: unknown) {
  const identity = extractExternalIdentity(provider, payload);
  const publicCodes = extractPublicCodeCandidates(payload);
  for (const publicCode of publicCodes) {
    const session = await issueVerificationCodeByPublicCode(provider, publicCode, identity);
    if (session) return session;
  }

  const candidates = extractTokenCandidates(payload);
  if (!candidates.length) {
    if (identity.externalChatId) {
      await sendMessengerMessage(provider, identity.externalChatId, "Не получилось распознать запрос. Откройте сайт Kaifbook и нажмите кнопку подтверждения ещё раз.");
    }
    return null;
  }

  for (const token of candidates) {
    const session = await issueVerificationCodeByToken(provider, token, identity);
    if (session) return session;
  }

  return null;
}

export async function issueVerificationCodeByToken(provider: VerificationProvider, token: string, identity: ExternalIdentity = {}) {
  const session = await prisma.verificationSession.findUnique({ where: { token } });
  return issueVerificationCodeForSession(provider, session, identity, true);
}

export async function issueVerificationCodeByPublicCode(provider: VerificationProvider, rawPublicCode: string, identity: ExternalIdentity = {}) {
  const publicCode = normalizePublicCode(rawPublicCode);
  if (publicCode.length < PUBLIC_CODE_LENGTH) return null;
  const session = await prisma.verificationSession.findUnique({ where: { publicCode } });
  return issueVerificationCodeForSession(provider, session, identity, false);
}

async function issueVerificationCodeForSession(provider: VerificationProvider, session: VerificationSession | null, identity: ExternalIdentity = {}, legacyToken = false) {
  if (!session || session.provider !== provider) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    const expired = await prisma.verificationSession.update({
      where: { id: session.id },
      data: { status: VERIFICATION_STATUSES.EXPIRED },
    });
    if (identity.externalChatId) {
      await sendMessengerMessage(provider, identity.externalChatId, "Срок действия запроса истёк. Откройте сайт Kaifbook и запросите новый код.");
    }
    return expired;
  }

  if (session.status !== VERIFICATION_STATUSES.PENDING) {
    if (identity.externalChatId && session.status === VERIFICATION_STATUSES.CONFIRMED) {
      await sendMessengerMessage(provider, identity.externalChatId, "Этот запрос уже подтверждён. Вернитесь на сайт Kaifbook.");
    }
    return session;
  }

  const code = generateMessengerCode();
  const phone = identity.contactPhoneFromProvider ? normalizePhone(identity.contactPhoneFromProvider) : null;
  const updated = await prisma.verificationSession.update({
    where: { id: session.id },
    data: {
      messengerCodeHash: await hashPassword(code),
      messengerCodeSentAt: new Date(),
      messengerCodeConsumedAt: null,
      messengerCodeAttempts: 0,
      codeExpiresAt: addMinutes(new Date(), SESSION_TTL_MINUTES),
      externalUserId: identity.externalUserId || null,
      externalChatId: identity.externalChatId || null,
      externalUsername: identity.externalUsername || null,
      contactPhoneFromProvider: phone,
      contactPhoneMatched: phone ? phone === session.phone : null,
    },
  });

  await sendMessengerMessage(
    provider,
    updated.externalChatId,
    legacyToken
      ? `${codeMessage(provider, code)} В следующий раз используйте короткую команду с сайта.`
      : codeMessage(provider, code),
  );
  return updated;
}

export async function confirmVerificationCode(input: { sessionId: string; phone: string; code: string }) {
  const phone = normalizePhone(input.phone);
  const code = normalizeMessengerCode(input.code);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");
  if (!input.sessionId) throw new ApiError(400, "Подтверждение через MAX или VK не найдено.");
  if (code.length !== 6) throw new ApiError(400, "Введите 6 цифр из сообщения.");

  const session = await prisma.verificationSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw new ApiError(404, "Подтверждение через MAX или VK не найдено.");
  if (session.phone !== phone) throw new ApiError(400, "Код создан для другого номера телефона.");
  if (session.status === VERIFICATION_STATUSES.CONFIRMED) return session;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.verificationSession.update({ where: { id: session.id }, data: { status: VERIFICATION_STATUSES.EXPIRED } });
    throw new ApiError(400, "Срок действия кода истёк. Запустите подтверждение ещё раз.");
  }
  if (session.status !== VERIFICATION_STATUSES.PENDING) throw new ApiError(400, "Подтверждение уже недоступно. Запустите его ещё раз.");
  if (!session.messengerCodeHash) throw new ApiError(400, "Сначала отправьте команду в MAX или VK, чтобы получить код.");
  if (session.messengerCodeAttempts >= MESSENGER_CODE_ATTEMPT_LIMIT) {
    await prisma.verificationSession.update({ where: { id: session.id }, data: { status: VERIFICATION_STATUSES.FAILED } });
    throw new ApiError(400, "Слишком много неверных попыток. Запустите подтверждение ещё раз.");
  }

  if (!(await verifyPassword(code, session.messengerCodeHash))) {
    const attempts = session.messengerCodeAttempts + 1;
    await prisma.verificationSession.update({
      where: { id: session.id },
      data: {
        messengerCodeAttempts: attempts,
        status: attempts >= MESSENGER_CODE_ATTEMPT_LIMIT ? VERIFICATION_STATUSES.FAILED : VERIFICATION_STATUSES.PENDING,
      },
    });
    throw new ApiError(400, attempts >= MESSENGER_CODE_ATTEMPT_LIMIT ? "Слишком много неверных попыток. Запустите подтверждение ещё раз." : "Код не подошёл. Проверьте сообщение и попробуйте ещё раз.");
  }

  return prisma.verificationSession.update({
    where: { id: session.id },
    data: {
      status: VERIFICATION_STATUSES.CONFIRMED,
      confirmedAt: new Date(),
      messengerCodeConsumedAt: new Date(),
    },
  });
}

export async function confirmVerificationByToken(provider: VerificationProvider, token: string, identity: ExternalIdentity = {}) {
  const session = await prisma.verificationSession.findUnique({ where: { token } });
  if (!session || session.provider !== provider) return null;
  if (session.status !== VERIFICATION_STATUSES.PENDING) return session;
  if (session.expiresAt.getTime() < Date.now()) {
    return prisma.verificationSession.update({ where: { id: session.id }, data: { status: VERIFICATION_STATUSES.EXPIRED } });
  }
  const phone = identity.contactPhoneFromProvider ? normalizePhone(identity.contactPhoneFromProvider) : null;
  return prisma.verificationSession.update({
    where: { id: session.id },
    data: {
      status: VERIFICATION_STATUSES.CONFIRMED,
      confirmedAt: new Date(),
      externalUserId: identity.externalUserId || null,
      externalChatId: identity.externalChatId || null,
      externalUsername: identity.externalUsername || null,
      contactPhoneFromProvider: phone,
      contactPhoneMatched: phone ? phone === session.phone : null,
    },
  });
}

// Code-free confirmation: when the user sends the short command in the chat,
// confirm the session directly (capturing their messenger id) instead of
// replying with a code to type. The site polls the session status and signs the
// guest in automatically. Same trust model as the code flow — the short public
// code, shown only on the user's screen, is the secret.
export async function confirmVerificationFromPublicCode(provider: VerificationProvider, payload: unknown) {
  const identity = extractExternalIdentity(provider, payload);
  const publicCodes = extractPublicCodeCandidates(payload);
  for (const publicCode of publicCodes) {
    const session = await confirmVerificationByPublicCode(provider, publicCode, identity);
    if (session) return session;
  }
  // No matching session — let the caller's fallback path message the user.
  return null;
}

export async function confirmVerificationByPublicCode(provider: VerificationProvider, rawPublicCode: string, identity: ExternalIdentity = {}) {
  const publicCode = normalizePublicCode(rawPublicCode);
  if (publicCode.length < PUBLIC_CODE_LENGTH) return null;
  const session = await prisma.verificationSession.findUnique({ where: { publicCode } });
  if (!session || session.provider !== provider) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    const expired = await prisma.verificationSession.update({ where: { id: session.id }, data: { status: VERIFICATION_STATUSES.EXPIRED } });
    if (identity.externalChatId) await sendMessengerMessage(provider, identity.externalChatId, "Срок действия запроса истёк. Откройте сайт Kaifbook и начните вход заново.");
    return expired;
  }
  if (session.status === VERIFICATION_STATUSES.CONFIRMED) {
    if (identity.externalChatId) await sendMessengerMessage(provider, identity.externalChatId, "Вход уже подтверждён ✅ Вернитесь на сайт Kaifbook.");
    return session;
  }
  if (session.status !== VERIFICATION_STATUSES.PENDING) return session;

  const phone = identity.contactPhoneFromProvider ? normalizePhone(identity.contactPhoneFromProvider) : null;
  const confirmed = await prisma.verificationSession.update({
    where: { id: session.id },
    data: {
      status: VERIFICATION_STATUSES.CONFIRMED,
      confirmedAt: new Date(),
      externalUserId: identity.externalUserId || null,
      externalChatId: identity.externalChatId || null,
      externalUsername: identity.externalUsername || null,
      contactPhoneFromProvider: phone,
      contactPhoneMatched: phone ? phone === session.phone : null,
    },
  });
  if (confirmed.externalChatId) {
    await sendMessengerMessage(provider, confirmed.externalChatId, "Kaifbook: вход подтверждён ✅ Вернитесь на сайт — мы откроем ваши брони автоматически.");
  }
  return confirmed;
}

export async function sendMessengerMessage(provider: string | null | undefined, chatId: string | null | undefined, message: string) {
  if (!provider || !chatId || !message) return;
  try {
    // Any VK-family provider ("vk" chat verification, "vk-mini-app") delivers
    // via the community token, with peer_id = the VK user id.
    if (provider.startsWith("vk")) {
      const token = process.env.VK_COMMUNITY_TOKEN;
      if (!token) return;
      const params = new URLSearchParams({
        access_token: token,
        v: process.env.VK_API_VERSION || "5.199",
        peer_id: chatId,
        random_id: String(Date.now()),
        message,
      });
      const vkResponse = await fetch("https://api.vk.com/method/messages.send", { method: "POST", body: params });
      // Surface real delivery failures (e.g. 901 — user disabled messages) so
      // they aren't lost; successful sends stay quiet (no PII in logs).
      const vkBody = await vkResponse.text().catch(() => "");
      if (vkBody.includes('"error"')) console.warn("[Kaifbook:vk-send] VK API error", vkBody.slice(0, 200));
      return;
    }

    if (provider === VERIFICATION_PROVIDERS.MAX) {
      const token = process.env.MAX_BOT_TOKEN;
      if (!token) return;
      const apiBase = process.env.MAX_API_BASE_URL || "https://platform-api.max.ru";
      await fetch(`${apiBase.replace(/\/+$/, "")}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Kaifbook:verification] messenger notification failed", { provider, chatId, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

export function reservationStatusMessage(input: { restaurantTitle?: string | null; reservationDate: Date; startTime: string; endTime: string; status: string }) {
  const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(input.reservationDate);
  const statusLabels: Record<string, string> = {
    new: "новая заявка",
    awaiting_restaurant_confirmation: "ожидает подтверждения ресторана",
    awaiting_deposit_payment: "ожидает оплаты депозита ресторану",
    deposit_paid: "оплачена ресторану",
    confirmed: "подтверждена",
    confirmed_by_restaurant: "подтверждена рестораном",
    cancelled: "отменена",
    cancelled_by_guest: "отменена гостем",
    cancelled_by_restaurant: "отменена рестораном",
    rejected: "отклонена",
    completed: "завершена",
    no_show: "гость не пришел",
    payment_expired: "отменена — депозит не оплачен вовремя",
    seated: "гость за столом",
  };
  return `Kaifbook: статус вашей заявки в ${input.restaurantTitle || "ресторане"} обновлен. Дата: ${date}, время: ${input.startTime}-${input.endTime}, статус: ${statusLabels[input.status] || "обновлен"}.`;
}

// Single place that decides whether/where to push a VK (or MAX) message about a
// reservation. The peer is the verified chat id when present, otherwise the VK
// user id captured from a VK Mini App booking. Best-effort: silent if the guest
// has no linked messenger or hasn't allowed messages from the community.
export type NotifiableReservation = {
  verificationProvider: string | null;
  verifiedExternalChatId: string | null;
  verifiedExternalUserId: string | null;
  customerPhone?: string | null;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  restaurantTitle?: string | null;
};

// Find the guest's VK chat from the most recent confirmed VK verification for a
// phone — so a booking made without VK verification still reaches the guest if
// they've ever confirmed a VK login/booking with the same number.
async function resolveVkPeerByPhone(rawPhone: string | null | undefined) {
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (!phone) return null;
  const linked = await prisma.verificationSession.findFirst({
    where: {
      phone,
      provider: VERIFICATION_PROVIDERS.VK,
      status: VERIFICATION_STATUSES.CONFIRMED,
      OR: [{ externalChatId: { not: null } }, { externalUserId: { not: null } }],
    },
    orderBy: { confirmedAt: "desc" },
    select: { provider: true, externalChatId: true, externalUserId: true },
  });
  if (!linked) return null;
  const peer = linked.externalChatId || linked.externalUserId;
  return peer ? { provider: linked.provider, peer } : null;
}

// The VK-verified phone from the guest's most recent VK ID login for this
// number. VK ID returns it once the "Номер телефона" access scope is granted.
export async function resolveVerifiedVkPhone(rawPhone: string | null | undefined) {
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (!phone) return null;
  const session = await prisma.verificationSession.findFirst({
    where: {
      phone,
      provider: "vk_id",
      status: VERIFICATION_STATUSES.CONFIRMED,
      contactPhoneFromProvider: { not: null },
    },
    orderBy: { confirmedAt: "desc" },
    select: { contactPhoneFromProvider: true },
  });
  return session?.contactPhoneFromProvider || null;
}

export async function notifyGuestReservationStatus(reservation: NotifiableReservation, status: string) {
  // A notification failure must never break the status change itself.
  try {
    let provider = reservation.verificationProvider;
    let peer = reservation.verifiedExternalChatId || reservation.verifiedExternalUserId;

    if (!peer) {
      const linked = await resolveVkPeerByPhone(reservation.customerPhone);
      if (linked) {
        provider = linked.provider;
        peer = linked.peer;
      }
    }

    if (!provider || !peer) return;
    await sendMessengerMessage(
      provider,
      peer,
      reservationStatusMessage({
        restaurantTitle: reservation.restaurantTitle,
        reservationDate: reservation.reservationDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status,
      }),
    );
  } catch (error) {
    console.error("[Kaifbook:notify] failed", error instanceof Error ? error.message : String(error));
  }
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || null;
}
