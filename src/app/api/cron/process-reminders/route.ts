import { handleApiError, ok } from "@/lib/api";
import { processDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Guarded by a shared secret so only the server's own cron can trigger it.
// Disabled (403) until CRON_SECRET is configured in the environment.
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const token = new URL(request.url).searchParams.get("token");
  return token === secret;
}

async function handle(request: Request) {
  try {
    if (!isAuthorized(request)) return new Response("Forbidden", { status: 403 });
    const summary = await processDueReminders();
    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = handle;
export const GET = handle;
