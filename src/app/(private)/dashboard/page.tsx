import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { FlashMessage } from "@/components/flash-message";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const [
    businesses,
    totalCustomers,
    totalLeads,
    newLeads,
    doneLeads,
    activePromos,
    generatedContent
  ] = await Promise.all([
    prisma.business.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            customers: true,
            leads: true,
            promos: true,
            generatedContents: true
          }
        }
      }
    }),
    prisma.customer.count({ where: { business: { userId: user.id } } }),
    prisma.lead.count({ where: { business: { userId: user.id } } }),
    prisma.lead.count({ where: { business: { userId: user.id }, status: "new" } }),
    prisma.lead.count({ where: { business: { userId: user.id }, status: "done" } }),
    prisma.promo.count({ where: { business: { userId: user.id }, isActive: true } }),
    prisma.generatedContent.count({ where: { business: { userId: user.id } } })
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Краткая сводка по бизнесам, заявкам, клиентам и AI-контенту."
        actions={
          <Link className="button" href="/businesses/new">
            <Plus size={18} aria-hidden="true" />
            Добавить бизнес
          </Link>
        }
      />
      <FlashMessage error={params.error} success={params.success} />

      <section className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Бизнесов" value={businesses.length} />
        <StatCard label="Клиентов" value={totalCustomers} />
        <StatCard label="Заявок" value={totalLeads} />
        <StatCard label="AI-текстов" value={generatedContent} />
      </section>

      <section className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Новые заявки" value={newLeads} />
        <StatCard label="Выполненные заявки" value={doneLeads} />
        <StatCard label="Активные акции" value={activePromos} />
      </section>

      <section className="grid grid-3">
        {businesses.map((business) => (
          <article className="card business-card" key={business.id}>
            <div>
              <span className="badge">{business.category}</span>
              <h2 style={{ marginTop: 14 }}>{business.name}</h2>
              <p className="muted">{business.description ?? "Описание пока не добавлено"}</p>
            </div>
            <div className="grid grid-2">
              <StatCard label="Клиенты" value={business._count.customers} />
              <StatCard label="Заявки" value={business._count.leads} />
            </div>
            <div className="toolbar">
              <Link className="button" href={`/businesses/${business.id}`}>
                Открыть
              </Link>
              <Link className="secondary-button" href={`/businesses/${business.id}/ai-content`}>
                <Sparkles size={16} aria-hidden="true" />
                AI
              </Link>
            </div>
          </article>
        ))}
      </section>

      {businesses.length === 0 ? (
        <div className="card">
          <h2>Добавьте первый бизнес</h2>
          <p className="muted">
            После создания появятся клиенты, заявки, акции, AI-генератор и публичная страница.
          </p>
          <Link className="button" href="/businesses/new">
            Добавить бизнес
          </Link>
        </div>
      ) : null}
    </>
  );
}
