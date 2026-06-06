import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { GuestTagsEditor } from "@/components/GuestTagsEditor";
import { OwnerTabs } from "@/components/OwnerTabs";
import { prisma } from "@/lib/db";
import { formatDate, reservationDateLabel } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";
import { STAFF_ROLES } from "@/lib/constants";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canAccessRestaurant } from "@/lib/permissions";

type Props = { params: Promise<{ restaurantId: string; guestId: string }> };

export default async function GuestPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId, guestId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, restaurantId },
    include: { reservations: { orderBy: [{ reservationDate: "desc" }, { startTime: "desc" }], include: { table: true, hall: true } } },
  });
  if (!guest) notFound();
  const guestTags = parseStringList(guest.tags);

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Карточка гостя</p>
        <h1>{guest.name}</h1>
        <p>{guest.phone}{guest.email ? ` · ${guest.email}` : ""}</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} isStaff={(STAFF_ROLES as readonly string[]).includes(user.role)} />

      <div className="guest-profile-grid">
        <aside className="panel">
          <h2>Профиль</h2>
          <div className="profile-fact-grid">
            <span>Броней</span><strong>{guest.reservationsCount}</strong>
            <span>Визитов</span><strong>{guest.visitsCount}</strong>
            <span>No-show</span><strong>{guest.noShowCount}</strong>
            <span>Отмен</span><strong>{guest.cancelledCount}</strong>
            <span>Последний визит</span><strong>{formatDate(guest.lastVisitAt)}</strong>
          </div>
          <div className="guest-tags-card">
            <div className="section-heading compact-heading">
              <h3>Роли и теги гостя</h3>
              <GuestTagsEditor restaurantId={restaurant.id} guestId={guest.id} guestName={guest.name} guestPhone={guest.phone} initialTags={guestTags} />
            </div>
            <div className="tag-row">
              {guestTags.length ? guestTags.map((tag) => <span key={tag}>{tag}</span>) : <span>Теги не добавлены</span>}
            </div>
          </div>
          <div className="form-note">{guest.notes || "Заметки менеджера появятся здесь после ручного заполнения."}</div>
          <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/guests`}>Назад к гостям</Link>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <h2>История броней</h2>
          </div>
          <div className="reservation-list">
            {guest.reservations.map((reservation) => (
              <div className="reservation-row" key={reservation.id}>
                <div>
                  <strong>{reservationDateLabel(reservation.reservationDate)} · {reservation.startTime}-{reservation.endTime}</strong>
                  <p>{reservation.guestsCount} гост. {reservation.occasion ? `· ${reservation.occasion}` : ""}</p>
                  <p>{reservation.hall?.title || "зал не выбран"}{reservation.table ? ` · стол ${reservation.table.number}` : ""}</p>
                  {reservation.comment ? <p>{reservation.comment}</p> : null}
                </div>
                <Badge status={reservation.status} />
              </div>
            ))}
            {!guest.reservations.length ? <div className="empty-state">Истории броней пока нет.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
