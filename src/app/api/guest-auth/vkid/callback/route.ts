import { handleApiError } from "@/lib/api";
import { completeVkIdCallback } from "@/lib/vkid-auth";

export async function GET(request: Request) {
  try {
    return completeVkIdCallback(new URL(request.url).searchParams);
  } catch (error) {
    return handleApiError(error);
  }
}
