import Link from "next/link";
import { redirect } from "next/navigation";
import { createLeadAction, updateLeadStatusAction } from "@/app/actions";
import { BusinessTabs } from "@/components/business-tabs";
import { FlashMessage } from "@/components/flash-message";
import { PageHeader } from "@/components/page-header";
import { formatDate, isLeadStatus, leadStatusLabels, leadStatuses } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type LeadsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    success?: string;
  }>;
};

function statusBadge(status: string) {
  if (!isLeadStatus(status)) {
    return "badge";
  }

  if (status === "in_progress") {
    return "badge badge-progress";
  }

  return `badge badge-${status}`;
}

export default async function LeadsPage({ params, searchParams }: LeadsPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id }
  });

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  const status = query.status && isLeadStatus(query.status) ? query.status : undefined;
  const leads = await prisma.lead.findMany({
    where: {
      businessId: business.id,
      ...(status ? { status } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <PageHeader
        title="Заявки"
        description={business.name}
        actions={
          <Link className="secondary-button" href={`/businesses/${business.id}`}>
            Назад к обзору
          </Link>
        }
      />
      <FlashMessage error={query.error} success={query.success} />
      <BusinessTabs businessId={business.id} />

      <section className="form-card" style={{ marginBottom: 18 }}>
        <h2>Добавить заявку</h2>
        <form action={createLeadAction.bind(null, business.id)} className="form-grid">
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="customerName">Имя клиента</label>
              <input id="customerName" name="customerName" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Телефон</label>
              <input id="phone" name="phone" required />
            </div>
            <div className="field">
              <label htmlFor="source">Источник</label>
              <input id="source" name="source" defaultValue="manual" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="message">Сообщение</label>
            <textarea id="message" name="message" />
          </div>
          <button className="button" type="submit">
            Добавить
          </button>
        </form>
      </section>

      <section className="table-card">
        <div className="table-header">
          <h2>Список заявок</h2>
          <form className="toolbar" action={`/businesses/${business.id}/leads`}>
            <select className="search-input" name="status" defaultValue={status ?? ""}>
              <option value="">Все статусы</option>
              {leadStatuses.map((item) => (
                <option value={item} key={item}>
                  {leadStatusLabels[item]}
                </option>
              ))}
            </select>
            <button className="secondary-button" type="submit">
              Фильтр
            </button>
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Сообщение</th>
                <th>Статус</th>
                <th>Источник</th>
                <th>Дата</th>
                <th>Изменить</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.customerName}</strong>
                    <div className="muted small">{lead.phone}</div>
                  </td>
                  <td>{lead.message || "—"}</td>
                  <td>
                    <span className={statusBadge(lead.status)}>
                      {isLeadStatus(lead.status) ? leadStatusLabels[lead.status] : lead.status}
                    </span>
                  </td>
                  <td>{lead.source}</td>
                  <td>{formatDate(lead.createdAt)}</td>
                  <td>
                    <form action={updateLeadStatusAction.bind(null, lead.id)} className="toolbar">
                      <select name="status" defaultValue={lead.status}>
                        {leadStatuses.map((item) => (
                          <option value={item} key={item}>
                            {leadStatusLabels[item]}
                          </option>
                        ))}
                      </select>
                      <button className="secondary-button" type="submit">
                        Сменить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Заявки не найдены.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
