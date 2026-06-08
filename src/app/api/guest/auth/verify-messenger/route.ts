import { handleApiError, ok, readJson } from "@/lib/api";
import { verifyGuestMessengerSession } from "@/lib/guest-phone-auth";
import { enforceRateLimit, getClientIp, MINUTE } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const phone = String(body?.phone || "");
    // Throttle code-guessing (the public code is short and brute-forceable).
    enforceRateLimit([
      { key: `verify:ip:${getClientIp(request)}`, rule: { limit: 20, windowMs: 15 * MINUTE } },
      { key: `verify:phone:${phone}`, rule: { limit: 10, windowMs: 15 * MINUTE } },
    ]);
    const user = await verifyGuestMessengerSession(phone, String(body?.verificationSessionId || ""), String(body?.code || ""));
    return ok({
      user,
      message: "Вход подтверждён. Теперь ваши брони доступны в личном кабинете.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
