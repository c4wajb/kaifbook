import { z } from "zod";
import { handleApiError, ok, readJson } from "@/lib/api";
import { requestIp } from "@/lib/verifications";
import { startVkIdAuth } from "@/lib/vkid-auth";

const startVkIdSchema = z.object({
  phone: z.string().trim().min(5),
  returnUrl: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = startVkIdSchema.parse(await readJson(request));
    const auth = await startVkIdAuth({ ...payload, ipAddress: requestIp(request) });
    return ok(auth, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
