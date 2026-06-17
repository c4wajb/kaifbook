import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminRestaurantLeadActions } from "@/components/admin/AdminRestaurantLeadActions";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { requireAdminPageUser } from "@/lib/page-auth";

type Props = { params: Promise<{ leadId: string }> };

const statusLabels: Record<string, string> = {
  new: "Новая",
  in_review: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};

export default async function AdminLeadDetailPage({ params }: Props) {
  await requireAdminPageUser("/admin/leads");
  const { leadId } = await params;
  const lead = await prisma.restaurantLead.findUnique({ where: { id: leadId } });
  if (!lead) notFound();

  const suggestedPassword = `Kaifbook-${lead.id.slice(-6)}!`;

  return (
    <div className="page owner-layout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Заявка на подключение</p>
          <h1>{lead.restaurantName}</h1>
        </div>
        <Link className="secondary-button" href="/admin/leads">
          Назад к заявкам
        </Link>
      </div>

      <section className="panel application-detail-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Карточка заявки</p>
            <h2>{lead.restaurantName}</h2>
          </div>
          <Badge status={lead.status}>{statusLabels[lead.status] || lead.status}</Badge>
        </div>

        <dl className="application-detail-grid">
          <div>
            <dt>Контактное лицо</dt>
            <dd>{lead.contactName}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{lead.phone}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{lead.email || "Не указан"}</dd>
          </div>
          <div>
            <dt>Город</dt>
            <dd>{lead.city}</dd>
          </div>
          <div>
            <dt>Адрес</dt>
            <dd>{lead.address || "Не указан"}</dd>
          </div>
          <div>
            <dt>Дата заявки</dt>
            <dd>{lead.createdAt.toLocaleString("ru-RU")}</dd>
          </div>
          <div className="full-span">
            <dt>Комментарий ресторана</dt>
            <dd>{lead.comment || "Комментария нет"}</dd>
          </div>
          <div className="full-span">
            <dt>Внутренний комментарий администратора</dt>
            <dd>{lead.adminComment || "Пока нет"}</dd>
          </div>
        </dl>

        {lead.createdRestaurantId ? (
          <Link className="button compact" href={`/owner/restaurants/${lead.createdRestaurantId}/edit`}>
            Открыть созданный ресторан
          </Link>
        ) : null}
      </section>

      <AdminRestaurantLeadActions
        applicationId={lead.id}
        defaultRestaurantName={lead.restaurantName}
        defaultOwnerName={lead.contactName}
        defaultOwnerEmail={lead.email || ""}
        defaultOwnerPhone={lead.phone}
        defaultCity={lead.city}
        defaultAddress={lead.address}
        suggestedPassword={suggestedPassword}
        isApproved={lead.status === "approved"}
        createdRestaurantId={lead.createdRestaurantId}
      />
    </div>
  );
}
