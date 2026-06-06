import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ServerDashboard } from "@/components/ServerDashboard";

export const dynamic = "force-dynamic";

export default async function StolixServerPage() {
  const h = await headers();
  const host = h.get("host") || "";
  if (!host.includes("stolix")) notFound();

  return <ServerDashboard apiUrl="/api/stolix/server-health" />;
}
