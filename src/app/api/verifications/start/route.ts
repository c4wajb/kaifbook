import { z } from "zod";
import { handleApiError, ok, readJson } from "@/lib/api";
import { startVerificationSession, requestIp } from "@/lib/verifications";

const startVerificationSchema = z.object({
  provider: z.enum(["max", "vk"]),
  phone: z.string().trim().min(5),
  guestName: z.string().trim().optional().nullable(),
  restaurantId: z.string().trim().optional().nullable(),
  bookingDraftId: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = startVerificationSchema.parse(await readJson(request));
    const session = await startVerificationSession({ ...payload, ipAddress: requestIp(request) });
    return ok({
      session: {
        id: session.id,
        provider: session.provider,
        status: session.status,
        expiresAt: session.expiresAt,
      },
      confirmUrl: session.confirmUrl,
      appUrl: session.appUrl,
      commandText: session.commandText,
      publicCode: session.publicCode,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
