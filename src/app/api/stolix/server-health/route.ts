import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = await headers();
  const host = h.get("host") || "";

  if (!host.includes("stolix")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Proxy to the main server-health logic, importing it directly
  const { getServerHealth } = await import("@/lib/server-health");
  const data = await getServerHealth();
  return NextResponse.json(data);
}
