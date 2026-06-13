"use client";

type VkLaunchParams = Record<string, string>;

export type VkMiniSession = {
  ok: boolean;
  sessionToken: string | null;
  vkUserId: string | null;
  isVerified: boolean;
};

function parseParamString(value: string) {
  const params = new URLSearchParams(value.startsWith("?") || value.startsWith("#") ? value.slice(1) : value);
  const result: VkLaunchParams = {};
  params.forEach((paramValue, key) => {
    result[key] = paramValue;
  });
  return result;
}

export function getVkLaunchParams() {
  if (typeof window === "undefined") return {};
  return {
    ...parseParamString(window.location.search),
    ...parseParamString(window.location.hash),
  };
}

export function isVkMiniAppRuntime(params = getVkLaunchParams()) {
  if (Object.keys(params).some((key) => key.startsWith("vk_"))) return true;
  if (typeof navigator === "undefined") return false;
  return /vk|vkontakte/i.test(navigator.userAgent);
}

export async function initVkBridge() {
  if (typeof window === "undefined") return { available: false };

  try {
    const module = await import("@vkontakte/vk-bridge");
    const bridge = module.default;
    await bridge.send("VKWebAppInit");
    return { available: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.info("[vk-mini] bridge unavailable", error);
    return { available: false };
  }
}

const VK_MINI_TOKEN_KEY = "kaifbook_vk_mini_token";

// Persist the signed session token so a booking submitted later in the same VK
// Mini App iframe can attach it (cookies are unreliable in a third-party
// iframe, so we pass the token explicitly via a header).
function storeVkMiniToken(token: string | null) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.sessionStorage.setItem(VK_MINI_TOKEN_KEY, token);
  } catch {
    // sessionStorage may be unavailable — notifications just won't be wired.
  }
}

export function getStoredVkMiniToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(VK_MINI_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function createVkMiniSession(launchParams = getVkLaunchParams()) {
  const response = await fetch("/api/vk-mini/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ launchParams }),
  });

  if (!response.ok) throw new Error("Не удалось создать VK Mini App сессию.");
  const session = (await response.json()) as VkMiniSession;
  storeVkMiniToken(session.sessionToken);
  return session;
}
