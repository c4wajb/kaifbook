import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUser } from "@/lib/guest-phone-auth";
import { normalizePhone } from "@/lib/phone";
import { getSessionSecret } from "@/lib/secrets";

const VK_ID_SESSION_TTL_MINUTES = 10;
const VK_ID_PROVIDER = "vk_id";

type VkTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  state?: string;
  scope?: string;
  user_id?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type VkUserInfoResponse = {
  user?: {
    user_id?: string | number;
    id?: string | number;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  error?: string;
  error_description?: string;
};

function appPublicUrl() {
  return (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function safeReturnUrl(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/guest/reservations";
  return value;
}

function vkIdAppId() {
  const raw = process.env.VK_ID_APP_ID || process.env.NEXT_PUBLIC_VK_ID_APP_ID;
  const appId = Number(raw);
  if (!Number.isInteger(appId) || appId <= 0) {
    throw new ApiError(503, "Вход через VK ID пока не настроен. Используйте MAX или VK-сообщество для получения кода.");
  }
  return appId;
}

function vkIdRedirectUrl() {
  return process.env.VK_ID_REDIRECT_URL || `${appPublicUrl()}/api/guest-auth/vkid/callback`;
}

function vkIdScope() {
  return process.env.VK_ID_SCOPE || (vkIdRequirePhoneMatch() ? "phone email" : "email");
}

function vkIdRequirePhoneMatch() {
  return process.env.VK_ID_REQUIRE_PHONE_MATCH === "true";
}

function base64url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function randomBase64Url(byteLength: number) {
  return base64url(randomBytes(byteLength));
}

function sha256Base64Url(value: string) {
  return base64url(createHash("sha256").update(value).digest());
}

function encryptionKey() {
  return createHash("sha256").update(getSessionSecret()).digest();
}

function encryptVerifier(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64url(iv)}.${base64url(tag)}.${base64url(encrypted)}`;
}

function decryptVerifier(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new ApiError(400, "Не удалось проверить VK ID. Начните вход заново.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
}

function redirectToLogin(returnUrl: string | null | undefined, phone: string | null | undefined, error?: string) {
  const url = new URL("/guest/login", appPublicUrl());
  url.searchParams.set("next", safeReturnUrl(returnUrl));
  if (phone) url.searchParams.set("phone", phone);
  if (error) url.searchParams.set("vkid_error", error);
  return NextResponse.redirect(url);
}

async function exchangeCodeForToken(input: {
  code: string;
  deviceId: string;
  state: string;
  codeVerifier: string;
}) {
  const appId = vkIdAppId();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    redirect_uri: vkIdRedirectUrl(),
    client_id: String(appId),
    code_verifier: input.codeVerifier,
    state: input.state,
    device_id: input.deviceId,
  });
  const body = new URLSearchParams({ code: input.code });
  const response = await fetch(`https://id.vk.com/oauth2/auth?${params}`, {
    method: "POST",
    body,
  });
  const data = (await response.json().catch(() => null)) as VkTokenResponse | null;
  if (!response.ok || !data || data.error || !data.access_token) {
    throw new ApiError(400, data?.error_description || "VK ID не подтвердил вход. Попробуйте ещё раз.");
  }
  return data;
}

async function loadVkUserInfo(accessToken: string) {
  const appId = vkIdAppId();
  const response = await fetch(`https://id.vk.com/oauth2/user_info?client_id=${appId}`, {
    method: "POST",
    body: new URLSearchParams({ access_token: accessToken }),
  });
  const data = (await response.json().catch(() => null)) as VkUserInfoResponse | null;
  if (!response.ok || !data || data.error || !data.user) {
    throw new ApiError(400, data?.error_description || "Не удалось получить данные VK ID. Попробуйте ещё раз.");
  }
  return data.user;
}

export async function startVkIdAuth(input: { phone: string; returnUrl?: string | null; ipAddress?: string | null }) {
  const appId = vkIdAppId();
  const phone = normalizePhone(input.phone);
  if (!/^\+7\d{10}$/.test(phone)) throw new ApiError(400, "Введите корректный номер телефона.");

  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = sha256Base64Url(codeVerifier);
  const expiresAt = addMinutes(new Date(), VK_ID_SESSION_TTL_MINUTES);

  await prisma.verificationSession.create({
    data: {
      provider: VK_ID_PROVIDER,
      method: VK_ID_PROVIDER,
      status: "pending",
      phone,
      token: randomBase64Url(24),
      returnUrl: safeReturnUrl(input.returnUrl),
      ipAddress: input.ipAddress || null,
      expiresAt,
      codeExpiresAt: expiresAt,
      vkState: state,
      vkCodeVerifierEncrypted: encryptVerifier(codeVerifier),
      vkCodeChallenge: codeChallenge,
    },
  });

  return {
    appId,
    redirectUrl: vkIdRedirectUrl(),
    state,
    codeChallenge,
    scope: vkIdScope(),
    expiresAt,
  };
}

export async function completeVkIdCallback(searchParams: URLSearchParams) {
  const state = searchParams.get("state") || "";
  const code = searchParams.get("code") || "";
  const deviceId = searchParams.get("device_id") || "";
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (!state) return redirectToLogin(null, null, error || "VK ID вернул неполный ответ. Попробуйте ещё раз.");
  const session = await prisma.verificationSession.findUnique({ where: { vkState: state } });
  if (!session) return redirectToLogin(null, null, "Сессия VK ID не найдена. Начните вход заново.");
  if (error || !code || !deviceId) {
    await prisma.verificationSession.update({
      where: { id: session.id },
      data: { status: "failed", lastErrorCode: searchParams.get("error") || "vk_id_error", lastErrorMessage: error || "VK ID не вернул код авторизации." },
    });
    return redirectToLogin(session.returnUrl, session.phone, error || "VK ID не подтвердил вход. Попробуйте ещё раз.");
  }
  if (session.status === "confirmed") {
    const user = await getOrCreateGuestUser(session.phone);
    await setSessionCookie(user);
    return NextResponse.redirect(new URL(safeReturnUrl(session.returnUrl), appPublicUrl()));
  }
  if (session.expiresAt.getTime() < Date.now() || !session.vkCodeVerifierEncrypted) {
    await prisma.verificationSession.update({ where: { id: session.id }, data: { status: "expired" } });
    return redirectToLogin(session.returnUrl, session.phone, "Время входа через VK ID истекло. Начните вход заново.");
  }
  if (session.status !== "pending") {
    return redirectToLogin(session.returnUrl, session.phone, "Эта сессия VK ID уже недоступна. Начните вход заново.");
  }

  try {
    const codeVerifier = decryptVerifier(session.vkCodeVerifierEncrypted);
    const token = await exchangeCodeForToken({ code, deviceId, state, codeVerifier });
    if (token.state && token.state !== state) {
      throw new ApiError(400, "VK ID вернул неверный state. Начните вход заново.");
    }
    if (!token.access_token) {
      throw new ApiError(400, "VK ID не вернул токен доступа. Попробуйте ещё раз.");
    }

    const userInfo = await loadVkUserInfo(token.access_token);
    const vkPhone = normalizePhone(userInfo.phone || "");
    const phoneMatches = Boolean(vkPhone && vkPhone === session.phone);
    if (vkIdRequirePhoneMatch() && !phoneMatches) {
      await prisma.verificationSession.update({
        where: { id: session.id },
        data: {
          status: "failed",
          lastErrorCode: "phone_mismatch",
          lastErrorMessage: "VK ID не вернул указанный на сайте телефон.",
          contactPhoneFromProvider: vkPhone || null,
          contactPhoneMatched: false,
        },
      });
      return redirectToLogin(session.returnUrl, session.phone, "VK ID должен быть привязан к тому же телефону, который указан на сайте.");
    }

    await prisma.verificationSession.update({
      where: { id: session.id },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        verifiedAt: new Date(),
        externalUserId: userInfo.user_id ? String(userInfo.user_id) : userInfo.id ? String(userInfo.id) : null,
        contactPhoneFromProvider: vkPhone,
        contactPhoneMatched: phoneMatches,
        vkUserId: userInfo.user_id ? String(userInfo.user_id) : userInfo.id ? String(userInfo.id) : null,
        vkEmail: userInfo.email || null,
        vkFirstName: userInfo.first_name || null,
        vkLastName: userInfo.last_name || null,
        vkRawUserJson: JSON.stringify(userInfo),
      },
    });

    const user = await getOrCreateGuestUser(session.phone);
    if (vkPhone) {
      // Store the VK-verified number separately — the user's own number stays
      // primary, but we keep the VK one so it isn't lost.
      await prisma.user.update({ where: { id: user.id }, data: { vkPhone } }).catch(() => {});
    }
    await setSessionCookie(user);
    return NextResponse.redirect(new URL(safeReturnUrl(session.returnUrl), appPublicUrl()));
  } catch (callbackError) {
    await prisma.verificationSession.update({
      where: { id: session.id },
      data: {
        status: "failed",
        lastErrorCode: callbackError instanceof ApiError ? "vk_id_callback" : "vk_id_unexpected",
        lastErrorMessage: callbackError instanceof Error ? callbackError.message : "Не удалось выполнить вход через VK ID.",
      },
    });
    return redirectToLogin(session.returnUrl, session.phone, callbackError instanceof Error ? callbackError.message : "Не удалось выполнить вход через VK ID.");
  }
}
