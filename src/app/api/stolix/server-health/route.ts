import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireAuth } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET() {
  try {
    const h = await headers();
    const host = h.get("host") || "";
    if (!host.includes("stolix")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Server health exposes nginx logs, the process list and disk usage — admin only.
    // (The Host header is client-controlled, so it can never be the sole gate.)
    const user = await requireAuth();
    if (user.role !== ROLES.ADMIN) throw new ApiError(403, "Доступно только администратору.");

    const { getServerHealth } = await import("@/lib/server-health");
    const data = await getServerHealth();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
