import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestTagsEditor } from "@/components/GuestTagsEditor";
import { OwnerTabs } from "@/components/OwnerTabs";
import { prisma } from "@/lib/db";
import { formatDate, reservationDateLabel, statusLabel } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canManageRestaurant } from "@/lib/permissions";

type Props = { params: Promise<{ restaurantId: string }>; searchParams: Promise<{ q?: string }> };

function normalizeText(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

export default async function GuestsPage({ params, searchParams }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const filters = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) notFound();

  const q = filters.q?.trim() || "";
  const rawGuests = await prisma.guest.findMany({
    where: { restaurantId },
    include: { reservations: { orderBy: [{ reservationDate: "desc" }, { startTime: "desc" }], take: 3 } },
    orderBy: [{ reservationsCount: "desc" }, { updatedAt: "desc" }],
  });
  const queryText = normalizeText(q);
  const queryDigits = normalizePhone(q);
  const guests = rawGuests.filter((guest) => {
    if (!queryText) return true;
    const textMatch = normalizeText(`${guest.name} ${guest.email || ""} ${guest.tags}`).includes(queryText);
    const phoneMatch = queryDigits.length > 0 && normalizePhone(guest.phone).includes(queryDigits);
    return textMatch || phoneMatch;
  });

  const repeatGuests = guests.filter((guest) => guest.reservationsCount > 1).length;
  const noShowRisk = guests.filter((guest) => guest.noShowCount > 0).length;

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">CRM гостей</p>
        <h1>{restaurant.title}</h1>
        <p>База гостей собирается автоматически по телефону: история визитов, повторы, неявки, теги и заметки.</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} />

      <section className="dashboard-grid">
        <div className="metric-card"><strong>{guests.length}</strong><span>гостей в базе</span></div>
        <div className="metric-card"><strong>{repeatGuests}</strong><span>повторных гостей</span></div>
        <div className="metric-card"><strong>{noShowRisk}</strong><span>с риском no-show</span></div>
        <div className="metric-card"><strong>{guests.reduce((sum, guest) => sum + guest.totalGuests, 0)}</strong><span>гостей обслужено</span></div>
      </section>

      <form className="filters owner-guest-filters" action={`/owner/restaurants/${restaurant.id}/guests`}>
        <label>
          <span>Имя или телефон</span>
          <input name="q" defaultValue={q || ""} placeholder="+7, Анна, VIP" />
        </label>
        <button className="button" type="submit">Найти</button>
      </form>

      <section className="panel">
        <div className="section-heading">
          <h2>Гости</h2>
        </div>
        <div className="guest-table">
          {guests.map((guest) => {
            const tags = parseStringList(guest.tags);
            return (
              <div className="guest-row" key={guest.id}>
                <div className="guest-person">
                  <strong>{guest.name}</strong>
                  <span>{guest.phone}</span>
                  {guest.email ? <span>{guest.email}</span> : null}
                </div>
                <div className="tag-row guest-tags">
                  {tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
                  {guest.reservationsCount > 1 ? <span>повторный</span> : null}
                  {guest.noShowCount > 0 ? <span>Риск неявки</span> : null}
                </div>
                <div className="guest-stats">
                  <strong>{guest.reservationsCount}</strong>
                  <span>броней</span>
                  <strong>{guest.visitsCount}</strong>
                  <span>визитов</span>
                </div>
                <div className="guest-last">
                  {guest.reservations[0] ? (
                    <>
                      <strong>{reservationDateLabel(guest.reservations[0].reservationDate)}</strong>
                      <span>{statusLabel(guest.reservations[0].status)}</span>
                    </>
                  ) : (
                    <span className="muted">Истории пока нет</span>
                  )}
                  <span>последний визит: {formatDate(guest.lastVisitAt)}</span>
                </div>
                <div className="guest-actions">
                  <GuestTagsEditor restaurantId={restaurant.id} guestId={guest.id} guestName={guest.name} guestPhone={guest.phone} initialTags={tags} compact />
                  <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/guests/${guest.id}`}>Карточка</Link>
                </div>
              </div>
            );
          })}
          {!rawGuests.length ? <div className="empty-state">Гости появятся здесь после первых броней.</div> : null}
          {rawGuests.length && !guests.length ? <div className="empty-state">Гости не найдены. Попробуйте изменить запрос.</div> : null}
        </div>
      </section>
    </div>
  );
}
