import Link from "next/link";
import { Badge } from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireAdminPageUser } from "@/lib/page-auth";

const statusLabels: Record<string, string> = {
  new: "Новая",
  in_review: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};
const statusPriority: Record<string, number> = { new: 0, in_review: 1, approved: 2, rejected: 3 };

export default async function AdminLeadsPage() {
  await requireAdminPageUser("/admin/leads");
  const leads = (await prisma.restaurantLead.findMany({ orderBy: { createdAt: "desc" } })).sort((a, b) => {
    const statusDelta = (statusPriority[a.status] ?? 10) - (statusPriority[b.status] ?? 10);
    return statusDelta || b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="page owner-layout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Админка платформы</p>
          <h1>Заявки ресторанов</h1>
        </div>
        <Link className="secondary-button" href="/admin">
          Назад в админку
        </Link>
      </div>

      <section className="panel application-list">
        {leads.map((lead) => (
          <article className="application-row" key={lead.id}>
            <Link className="application-main" href={`/admin/leads/${lead.id}`}>
              <strong>{lead.restaurantName}</strong>
              <span>{lead.contactName} · {lead.phone}{lead.email ? ` · ${lead.email}` : ""}</span>
              <span>{lead.city}{lead.address ? `, ${lead.address}` : ""}</span>
              {lead.comment ? <small>{lead.comment}</small> : null}
            </Link>
            <div className="application-meta">
              <Badge status={lead.status}>{statusLabels[lead.status] || lead.status}</Badge>
              <span>{lead.createdAt.toLocaleDateString("ru-RU")}</span>
            </div>
            <div className="application-actions">
              <Link className="small-button" href={`/admin/leads/${lead.id}`}>
                Открыть
              </Link>
            </div>
          </article>
        ))}
        {!leads.length ? (
          <div className="empty-state">
            <strong>Заявок пока нет</strong>
            <span>Когда ресторан отправит заявку на подключение, она появится здесь.</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
