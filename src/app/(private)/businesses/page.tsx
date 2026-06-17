import Link from "next/link";
import { Plus } from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type BusinessesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function BusinessesPage({ searchParams }: BusinessesPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const businesses = await prisma.business.findMany({
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
  });

  return (
    <>
      <PageHeader
        title="Бизнесы"
        description="Создавайте карточки локальных проектов и управляйте CRM-разделами."
        actions={
          <Link className="button" href="/businesses/new">
            <Plus size={18} aria-hidden="true" />
            Новый бизнес
          </Link>
        }
      />
      <FlashMessage error={params.error} success={params.success} />

      <section className="grid grid-3">
        {businesses.map((business) => (
          <article className="card business-card" key={business.id}>
            <div>
              <span className="badge">{business.category}</span>
              <h2 style={{ marginTop: 14 }}>{business.name}</h2>
              <p className="muted">{business.address || business.city}</p>
              <p>{business.description ?? "Описание пока не добавлено"}</p>
            </div>
            <div className="toolbar">
              <Link className="button" href={`/businesses/${business.id}`}>
                Кабинет
              </Link>
              <Link className="secondary-button" href={`/b/${business.slug}`}>
                Публичная
              </Link>
            </div>
          </article>
        ))}
      </section>

      {businesses.length === 0 ? (
        <div className="card">
          <h2>Список пуст</h2>
          <p className="muted">Добавьте бизнес, чтобы включить лендинг, заявки и AI-тексты.</p>
        </div>
      ) : null}
    </>
  );
}
