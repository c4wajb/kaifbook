import { NextResponse } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api";
import { VERIFICATION_PROVIDERS } from "@/lib/constants";
import { extractExternalIdentity, issueVerificationCodeByToken, issueVerificationCodeFromPayload } from "@/lib/verifications";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) result |= bufA[i] ^ bufB[i];
  return result === 0;
}

function hasValidSecret(request: Request) {
  const expected = process.env.MAX_WEBHOOK_SECRET;
  if (!expected) return false;
  const actual = request.headers.get("x-max-webhook-secret") || request.headers.get("x-webhook-secret");
  if (!actual) return false;
  return timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  try {
    if (!hasValidSecret(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const payload = await readJson(request);
    const tokenFromUrl = new URL(request.url).searchParams.get("token");
    if (tokenFromUrl) {
      await issueVerificationCodeByToken(VERIFICATION_PROVIDERS.MAX, tokenFromUrl, extractExternalIdentity(VERIFICATION_PROVIDERS.MAX, payload));
    } else {
      await issueVerificationCodeFromPayload(VERIFICATION_PROVIDERS.MAX, payload);
    }
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
