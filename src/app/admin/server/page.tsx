import { requireAdminPageUser } from "@/lib/page-auth";
import { ServerDashboard } from "@/components/admin/ServerDashboard";

export const dynamic = "force-dynamic";

export default async function ServerPage() {
  await requireAdminPageUser("/admin/server");
  return <ServerDashboard />;
}
