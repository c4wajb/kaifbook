import { handleApiError, ok, readJson } from "@/lib/api";
import { verifyGuestMessengerSession } from "@/lib/guest-phone-auth";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const user = await verifyGuestMessengerSession(String(body?.phone || ""), String(body?.verificationSessionId || ""), String(body?.code || ""));
    return ok({
      user,
      message: "Вход подтверждён. Теперь ваши брони доступны в личном кабинете.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
