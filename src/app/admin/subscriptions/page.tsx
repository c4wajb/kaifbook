import { requireAdminPageUser } from "@/lib/page-auth";

export default async function AdminSubscriptionsPage() {
  await requireAdminPageUser("/admin/subscriptions");
  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Админка</p>
        <h1>Подписки</h1>
      </div>
      <section className="panel">
        <p>Раздел подписок отключен.</p>
      </section>
    </div>
  );
}
