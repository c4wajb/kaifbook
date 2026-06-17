import Link from "next/link";
import { redirect } from "next/navigation";
import { generateContentAction } from "@/app/actions";
import { BusinessTabs } from "@/components/restaurant/business-tabs";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { contentTones, contentTypeLabels, contentTypes, formatDate } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type AiContentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    generated?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function AiContentPage({ params, searchParams }: AiContentPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const [business, businesses] = await Promise.all([
    prisma.business.findFirst({
      where: { id, userId: user.id }
    }),
    prisma.business.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  const [history, generated] = await Promise.all([
    prisma.generatedContent.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    query.generated
      ? prisma.generatedContent.findFirst({
          where: {
            id: query.generated,
            business: { userId: user.id }
          }
        })
      : Promise.resolve(null)
  ]);

  return (
    <>
      <PageHeader
        title="AI-генератор контента"
        description={business.name}
        actions={
          <Link className="secondary-button" href={`/businesses/${business.id}`}>
            Назад к обзору
          </Link>
        }
      />
      <FlashMessage error={query.error} success={query.success} />
      <BusinessTabs businessId={business.id} />

      <section className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="form-card">
          <h2>Сгенерировать текст</h2>
          <form action={generateContentAction} className="form-grid">
            <div className="field">
              <label htmlFor="businessId">Бизнес</label>
              <select id="businessId" name="businessId" defaultValue={business.id} required>
                {businesses.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="type">Тип контента</label>
                <select id="type" name="type" defaultValue="post_telegram" required>
                  {contentTypes.map((type) => (
                    <option value={type} key={type}>
                      {contentTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="tone">Тон</label>
                <select id="tone" name="tone" defaultValue="продающий" required>
                  {contentTones.map((tone) => (
                    <option value={tone} key={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="details">Дополнительное описание</label>
              <textarea
                id="details"
                name="details"
                required
                placeholder="Например: рассказать про бизнес-ланч, пробное занятие, отзыв клиента или новую услугу"
              />
            </div>
            <button className="button" type="submit">
              Сгенерировать
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Результат</h2>
          {generated ? (
            <>
              <p className="muted">
                {contentTypeLabels[generated.type as keyof typeof contentTypeLabels] ??
                  generated.type}{" "}
                · {formatDate(generated.createdAt)}
              </p>
              <div className="generated-result">{generated.result}</div>
            </>
          ) : (
            <p className="muted">Сгенерированный текст появится здесь.</p>
          )}
        </div>
      </section>

      <section className="table-card" style={{ marginTop: 18 }}>
        <div className="table-header">
          <h2>История генераций</h2>
          <span className="muted small">Последние 10 текстов</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Результат</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>
                    {contentTypeLabels[item.type as keyof typeof contentTypeLabels] ?? item.type}
                  </td>
                  <td>{item.result.slice(0, 180)}...</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    История пока пустая.
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
