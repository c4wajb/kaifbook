import { handleApiError, ok, readJson } from "@/lib/api";
import { loginGuestByConfirmedSession, verifyGuestMessengerSession } from "@/lib/guest-phone-auth";
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
    const sessionId = String(body?.verificationSessionId || "");
    const code = String(body?.code || "");
    // No code → the session must already be confirmed in the chat (VK direct
    // confirmation, picked up by polling). Otherwise verify the typed code.
    const user = code
      ? await verifyGuestMessengerSession(phone, sessionId, code)
      : await loginGuestByConfirmedSession(phone, sessionId);
    return ok({
      user,
      message: "Вход подтверждён. Теперь ваши брони доступны в личном кабинете.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
