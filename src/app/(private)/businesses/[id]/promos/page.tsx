import Link from "next/link";
import { redirect } from "next/navigation";
import { createPromoAction, deactivatePromoAction, updatePromoAction } from "@/app/actions";
import { BusinessTabs } from "@/components/restaurant/business-tabs";
import { DateInput } from "@/components/ui/DateInput";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { dateInputValue, formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type PromosPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PromosPage({ params, searchParams }: PromosPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id }
  });

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  const promos = await prisma.promo.findMany({
    where: { businessId: business.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
  });

  return (
    <>
      <PageHeader
        title="Акции"
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
        <h2>Создать акцию</h2>
        <form action={createPromoAction.bind(null, business.id)} className="form-grid">
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="title">Название</label>
              <input id="title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="discount">Скидка/выгода</label>
              <input id="discount" name="discount" placeholder="20%, подарок, бесплатно" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Описание</label>
            <textarea id="description" name="description" required />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <DateInput name="startDate" label="Дата начала" />
            </div>
            <div className="field">
              <DateInput name="endDate" label="Дата окончания" />
            </div>
          </div>
          <button className="button" type="submit">
            Создать
          </button>
        </form>
      </section>

      <section className="grid grid-2">
        {promos.map((promo) => (
          <article className="card" key={promo.id}>
            <span className={promo.isActive ? "badge badge-active" : "badge"}>
              {promo.isActive ? "Активна" : "Отключена"}
            </span>
            <h2 style={{ marginTop: 12 }}>{promo.title}</h2>
            <p>{promo.description}</p>
            <p className="muted">
              Выгода: {promo.discount || "не указана"} · {formatDate(promo.startDate)} -{" "}
              {formatDate(promo.endDate)}
            </p>
            <details>
              <summary>Редактировать</summary>
              <form
                action={updatePromoAction.bind(null, promo.id)}
                className="form-grid"
                style={{ marginTop: 12 }}
              >
                <div className="field">
                  <label htmlFor={`title-${promo.id}`}>Название</label>
                  <input id={`title-${promo.id}`} name="title" defaultValue={promo.title} required />
                </div>
                <div className="field">
                  <label htmlFor={`description-${promo.id}`}>Описание</label>
                  <textarea
                    id={`description-${promo.id}`}
                    name="description"
                    defaultValue={promo.description}
                    required
                  />
                </div>
                <div className="grid grid-3">
                  <div className="field">
                    <label htmlFor={`discount-${promo.id}`}>Выгода</label>
                    <input
                      id={`discount-${promo.id}`}
                      name="discount"
                      defaultValue={promo.discount ?? ""}
                    />
                  </div>
                  <div className="field">
                    <DateInput name="startDate" label="Дата начала" defaultValue={dateInputValue(promo.startDate)} />
                  </div>
                  <div className="field">
                    <DateInput name="endDate" label="Дата окончания" defaultValue={dateInputValue(promo.endDate)} />
                  </div>
                </div>
                <label className="toolbar">
                  <input name="isActive" type="checkbox" defaultChecked={promo.isActive} />
                  Активна
                </label>
                <button className="button" type="submit">
                  Сохранить
                </button>
              </form>
            </details>
            {promo.isActive ? (
              <form action={deactivatePromoAction.bind(null, promo.id)} style={{ marginTop: 10 }}>
                <button className="danger-button" type="submit">
                  Отключить
                </button>
              </form>
            ) : null}
          </article>
        ))}
        {promos.length === 0 ? (
          <article className="card">
            <h2>Акций пока нет</h2>
            <p className="muted">Создайте первую акцию и покажите ее на публичной странице.</p>
          </article>
        ) : null}
      </section>
    </>
  );
}
