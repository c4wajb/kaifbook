import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import { deleteBusinessAction } from "@/app/actions";
import { BusinessTabs } from "@/components/restaurant/business-tabs";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type BusinessPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function BusinessPage({ params, searchParams }: BusinessPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const business = await prisma.business.findFirst({
    where: { id, userId: user.id },
    include: {
      promos: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 3
      }
    }
  });

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  const [customers, leads, newLeads, doneLeads, activePromos, aiTexts] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.lead.count({ where: { businessId: business.id } }),
    prisma.lead.count({ where: { businessId: business.id, status: "new" } }),
    prisma.lead.count({ where: { businessId: business.id, status: "done" } }),
    prisma.promo.count({ where: { businessId: business.id, isActive: true } }),
    prisma.generatedContent.count({ where: { businessId: business.id } })
  ]);

  return (
    <>
      <PageHeader
        title={business.name}
        description={`${business.category} · ${business.city}`}
        actions={
          <>
            <Link className="secondary-button" href={`/businesses/${business.id}/edit`}>
              <Pencil size={16} aria-hidden="true" />
              Редактировать
            </Link>
            <Link className="button" href={`/b/${business.slug}`}>
              <ExternalLink size={16} aria-hidden="true" />
              Публичная страница
            </Link>
          </>
        }
      />
      <FlashMessage error={query.error} success={query.success} />
      <BusinessTabs businessId={business.id} />

      <section className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Всего клиентов" value={customers} />
        <StatCard label="Всего заявок" value={leads} />
        <StatCard label="Новые заявки" value={newLeads} />
        <StatCard label="Выполненные заявки" value={doneLeads} />
        <StatCard label="Активные акции" value={activePromos} />
        <StatCard label="AI-текстов" value={aiTexts} />
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Карточка бизнеса</h2>
          <p>
            <strong>Адрес:</strong> {business.address || "не указан"}
          </p>
          <p>
            <strong>Телефон:</strong> {business.phone || "не указан"}
          </p>
          <p>
            <strong>Описание:</strong> {business.description || "не указано"}
          </p>
          <p className="muted small">Создан: {formatDate(business.createdAt)}</p>
        </article>

        <article className="card">
          <h2>Активные акции</h2>
          {business.promos.length ? (
            <div className="grid">
              {business.promos.map((promo) => (
                <div key={promo.id}>
                  <span className="badge badge-active">Активна</span>
                  <h3 style={{ marginTop: 10 }}>{promo.title}</h3>
                  <p className="muted">{promo.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Акций пока нет.</p>
          )}
        </article>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Опасная зона</h2>
        <p className="muted">
          Удаление бизнеса также удалит клиентов, заявки, акции и AI-историю.
        </p>
        <form action={deleteBusinessAction.bind(null, business.id)}>
          <button className="danger-button" type="submit">
            Удалить бизнес
          </button>
        </form>
      </section>
    </>
  );
}
