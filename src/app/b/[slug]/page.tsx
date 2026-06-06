import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { publicLeadAction } from "@/app/actions";
import { FlashMessage } from "@/components/flash-message";
import { formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";

type PublicBusinessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export async function generateMetadata({ params }: PublicBusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, description: true }
  });

  if (!business) {
    return {
      title: "Бизнес не найден"
    };
  }

  return {
    title: `${business.name} | Курск`,
    description: business.description ?? "Локальный бизнес в Курске"
  };
}

export default async function PublicBusinessPage({
  params,
  searchParams
}: PublicBusinessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      promos: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!business) {
    notFound();
  }

  return (
    <main className="public-page">
      <section className="public-hero">
        <div>
          <span className="badge badge-active">{business.category}</span>
          <h1>{business.name}</h1>
          <p>{business.description ?? "Локальный бизнес в Курске."}</p>
          <div className="toolbar">
            {business.address ? (
              <span className="badge">
                <MapPin size={14} aria-hidden="true" />
                {business.address}
              </span>
            ) : null}
            {business.phone ? (
              <span className="badge">
                <Phone size={14} aria-hidden="true" />
                {business.phone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="form-card public-form">
          <h2>Оставить заявку</h2>
          <FlashMessage error={query.error} success={query.success} />
          <form action={publicLeadAction.bind(null, business.slug)} className="form-grid">
            <div className="field">
              <label htmlFor="customerName">Имя</label>
              <input id="customerName" name="customerName" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Телефон</label>
              <input id="phone" name="phone" required />
            </div>
            <div className="field">
              <label htmlFor="message">Сообщение</label>
              <textarea id="message" name="message" placeholder="Что вас интересует?" />
            </div>
            <button className="button" type="submit">
              Отправить
            </button>
          </form>
        </div>
      </section>

      <section className="public-section">
        <div className="page-header">
          <div>
            <h1>Акции</h1>
            <p>Актуальные предложения бизнеса.</p>
          </div>
        </div>
        <div className="grid grid-3">
          {business.promos.map((promo) => (
            <article className="card" key={promo.id}>
              <span className="badge badge-active">{promo.discount || "Акция"}</span>
              <h2 style={{ marginTop: 12 }}>{promo.title}</h2>
              <p>{promo.description}</p>
              <p className="muted small">
                {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
              </p>
            </article>
          ))}
          {business.promos.length === 0 ? (
            <article className="card">
              <h2>Скоро здесь появятся акции</h2>
              <p className="muted">Свяжитесь с бизнесом, чтобы узнать текущие предложения.</p>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}
