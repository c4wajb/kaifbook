import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/secrets";

// Signed VK Mini App session. The token carries the VK user id and whether the
// VK launch-params signature checked out. It is signed with VK_APP_SECRET (or
// the app session secret), so a client can't forge it — which is why we trust
// the embedded vkUserId for sending VK notifications.
export type VkMiniSessionClaims = {
  vkUserId: string | null;
  vkAppId: string | null;
  verified: boolean;
  paramsHash: string;
};

const TOKEN_TTL = "2h";

function secret() {
  return new TextEncoder().encode(process.env.VK_APP_SECRET || getSessionSecret());
}

export async function signVkMiniSession(claims: VkMiniSessionClaims) {
  return new SignJWT({ source: "vk-mini-app", ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret());
}

// Verify a token (from the x-vk-mini-session header) and return the VK user id
// only when the launch params were genuinely signed by VK. Returns null on any
// problem — callers fall back to "no VK notification".
export async function getVerifiedVkUserId(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.source !== "vk-mini-app" || payload.verified !== true) return null;
    const vkUserId = typeof payload.vkUserId === "string" ? payload.vkUserId : null;
    return vkUserId && /^\d{1,20}$/.test(vkUserId) ? vkUserId : null;
  } catch {
    return null;
  }
}
