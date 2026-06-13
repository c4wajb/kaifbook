import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { handleApiError, ok, readJson } from "@/lib/api";
import { signVkMiniSession } from "@/lib/vk-mini-session";

export const runtime = "nodejs";

const launchParamsSchema = z.object({
  launchParams: z.record(z.string(), z.string()).default({}),
});

function safeCompare(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  if (firstBuffer.length !== secondBuffer.length) return false;
  return timingSafeEqual(firstBuffer, secondBuffer);
}

function signedPayload(params: Record<string, string>) {
  return Object.keys(params)
    .filter((key) => key.startsWith("vk_"))
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function verifyVkLaunchParams(params: Record<string, string>) {
  const secret = process.env.VK_APP_SECRET;
  const signature = params.sign;
  if (!secret || !signature) return false;

  const payload = signedPayload(params);
  if (!payload) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  return safeCompare(expected, signature);
}

function paramsHash(params: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(params)).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { launchParams } = launchParamsSchema.parse(await readJson(request));
    const isVerified = verifyVkLaunchParams(launchParams);
    const vkUserId = launchParams.vk_user_id || null;
    const vkAppId = launchParams.vk_app_id || process.env.VK_APP_ID || process.env.NEXT_PUBLIC_VK_APP_ID || null;

    const sessionToken = await signVkMiniSession({
      vkUserId,
      vkAppId,
      verified: isVerified,
      paramsHash: paramsHash(launchParams),
    });

    return ok({
      ok: true,
      sessionToken,
      vkUserId: isVerified ? vkUserId : null,
      isVerified,
      // Community id so the client can ask the user to allow messages, which is
      // required for VK to deliver booking-status notifications.
      groupId: process.env.VK_GROUP_ID || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
