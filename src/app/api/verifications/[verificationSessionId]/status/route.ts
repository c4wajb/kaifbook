import { handleApiError, ok } from "@/lib/api";
import { getVerificationSessionStatus, verificationProviderLabel } from "@/lib/verifications";

type Context = { params: Promise<{ verificationSessionId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { verificationSessionId } = await context.params;
    const session = await getVerificationSessionStatus(verificationSessionId);
    return ok({
      id: session.id,
      provider: session.provider,
      providerLabel: verificationProviderLabel(session.provider),
      status: session.status,
      expiresAt: session.expiresAt,
      confirmedAt: session.confirmedAt,
      contactPhoneMatched: session.contactPhoneMatched,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
