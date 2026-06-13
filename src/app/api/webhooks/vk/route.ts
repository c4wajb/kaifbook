import { NextResponse } from "next/server";
import { handleApiError, readJson } from "@/lib/api";
import { VERIFICATION_PROVIDERS } from "@/lib/constants";
import { timingSafeEqualString } from "@/lib/secrets";
import { confirmVerificationFromPublicCode, extractExternalIdentity, issueVerificationCodeByToken, issueVerificationCodeFromPayload } from "@/lib/verifications";

function hasValidSecret(payload: unknown) {
  const expected = process.env.VK_CALLBACK_SECRET;
  // Fail closed: if no secret is configured, reject everything (matching the
  // MAX webhook). VK includes `secret` in every request when one is set.
  if (!expected) return false;
  if (!payload || typeof payload !== "object") return false;
  const actual = (payload as { secret?: unknown }).secret;
  if (typeof actual !== "string") return false;
  return timingSafeEqualString(actual, expected);
}

export async function POST(request: Request) {
  try {
    const payload = await readJson(request);
    // Verify the shared secret BEFORE doing anything — including returning the
    // confirmation code, which must never be disclosed to unauthenticated callers.
    if (!hasValidSecret(payload)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (payload && typeof payload === "object" && (payload as { type?: unknown }).type === "confirmation") {
      return new NextResponse(process.env.VK_CONFIRMATION_CODE || "", { status: 200 });
    }

    const tokenFromUrl = new URL(request.url).searchParams.get("token");
    if (tokenFromUrl) {
      await issueVerificationCodeByToken(VERIFICATION_PROVIDERS.VK, tokenFromUrl, extractExternalIdentity(VERIFICATION_PROVIDERS.VK, payload));
    } else {
      // Confirm the login directly (code-free) when the message carries the
      // short command. Fall back to the legacy code reply if nothing matched.
      const confirmed = await confirmVerificationFromPublicCode(VERIFICATION_PROVIDERS.VK, payload);
      if (!confirmed) await issueVerificationCodeFromPayload(VERIFICATION_PROVIDERS.VK, payload);
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
