import { NextResponse } from "next/server";
import { handleApiError, readJson } from "@/lib/api";
import { VERIFICATION_PROVIDERS } from "@/lib/constants";
import { extractExternalIdentity, issueVerificationCodeByToken, issueVerificationCodeFromPayload } from "@/lib/verifications";

function hasValidSecret(payload: unknown) {
  const expected = process.env.VK_CALLBACK_SECRET;
  if (!expected) return true;
  if (!payload || typeof payload !== "object") return false;
  return (payload as { secret?: unknown }).secret === expected;
}

export async function POST(request: Request) {
  try {
    const payload = await readJson(request);
    if (payload && typeof payload === "object" && (payload as { type?: unknown }).type === "confirmation") {
      return new NextResponse(process.env.VK_CONFIRMATION_CODE || "", { status: 200 });
    }
    if (!hasValidSecret(payload)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tokenFromUrl = new URL(request.url).searchParams.get("token");
    if (tokenFromUrl) {
      await issueVerificationCodeByToken(VERIFICATION_PROVIDERS.VK, tokenFromUrl, extractExternalIdentity(VERIFICATION_PROVIDERS.VK, payload));
    } else {
      await issueVerificationCodeFromPayload(VERIFICATION_PROVIDERS.VK, payload);
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
