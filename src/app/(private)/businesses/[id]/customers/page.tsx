import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction
} from "@/app/actions";
import { BusinessTabs } from "@/components/restaurant/business-tabs";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type CustomersPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id }
  });

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  const q = query.q?.trim();
  const customers = await prisma.customer.findMany({
    where: {
      businessId: business.id,
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { phone: { contains: q } }]
          }
        : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <PageHeader
        title="Клиенты"
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
        <h2>Добавить клиента</h2>
        <form action={createCustomerAction.bind(null, business.id)} className="form-grid">
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="name">Имя</label>
              <input id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Телефон</label>
              <input id="phone" name="phone" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="source">Источник</label>
              <input id="source" name="source" defaultValue="manual" />
            </div>
            <div className="field">
              <label htmlFor="comment">Комментарий</label>
              <input id="comment" name="comment" />
            </div>
          </div>
          <button className="button" type="submit">
            Добавить
          </button>
        </form>
      </section>

      <section className="table-card">
        <div className="table-header">
          <h2>Список клиентов</h2>
          <form className="toolbar" action={`/businesses/${business.id}/customers`}>
            <input
              className="search-input"
              name="q"
              placeholder="Поиск по имени или телефону"
              defaultValue={q}
            />
            <button className="secondary-button" type="submit">
              Найти
            </button>
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Контакты</th>
                <th>Источник</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    <div className="muted small">{customer.comment || "Без комментария"}</div>
                  </td>
                  <td>
                    {customer.phone}
                    <div className="muted small">{customer.email || "Email не указан"}</div>
                  </td>
                  <td>{customer.source}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>
                    <details>
                      <summary>Редактировать</summary>
                      <form
                        action={updateCustomerAction.bind(null, customer.id)}
                        className="form-grid"
                        style={{ marginTop: 12, minWidth: 260 }}
                      >
                        <div className="field">
                          <label htmlFor={`name-${customer.id}`}>Имя</label>
                          <input
                            id={`name-${customer.id}`}
                            name="name"
                            defaultValue={customer.name}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`phone-${customer.id}`}>Телефон</label>
                          <input
                            id={`phone-${customer.id}`}
                            name="phone"
                            defaultValue={customer.phone}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`email-${customer.id}`}>Email</label>
                          <input
                            id={`email-${customer.id}`}
                            name="email"
                            type="email"
                            defaultValue={customer.email ?? ""}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`source-${customer.id}`}>Источник</label>
                          <input
                            id={`source-${customer.id}`}
                            name="source"
                            defaultValue={customer.source}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`comment-${customer.id}`}>Комментарий</label>
                          <textarea
                            id={`comment-${customer.id}`}
                            name="comment"
                            defaultValue={customer.comment ?? ""}
                          />
                        </div>
                        <div className="toolbar">
                          <button className="button" type="submit">
                            Сохранить
                          </button>
                        </div>
                      </form>
                      <form action={deleteCustomerAction.bind(null, customer.id)} style={{ marginTop: 8 }}>
                        <button className="danger-button" type="submit">
                          Удалить
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Клиенты не найдены.
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
