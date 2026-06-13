import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CalendarClock, MousePointerClick, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { RESERVATION_STATUSES, ROLES, STAFF_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { getStaffRestaurantIds } from "@/lib/permissions";

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default async function OwnerDashboardPage() {
  const user = await requireOwnerPageUser("/owner/dashboard");
  const isStaff = (STAFF_ROLES as readonly string[]).includes(user.role);
  const staffRestaurantIds = isStaff ? await getStaffRestaurantIds(user.id) : [];

  if (isStaff && staffRestaurantIds.length > 0) {
    redirect(`/owner/restaurants/${staffRestaurantIds[0]}/reservations`);
  }
  const restaurantWhere = user.role === ROLES.ADMIN ? {} : isStaff ? { id: { in: staffRestaurantIds } } : { ownerId: user.id };
  const reservationRestaurantWhere = user.role === ROLES.ADMIN ? undefined : isStaff ? { is: { id: { in: staffRestaurantIds } } } : { is: { ownerId: user.id } };
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const last30 = addDays(today, -29);

  const [restaurants, reservations, guestsCount, pageViews, bookingClicks] = await Promise.all([
    prisma.restaurant.findMany({ where: restaurantWhere, include: { _count: { select: { reservations: true, tables: true, guests: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.reservation.findMany({ where: { restaurant: reservationRestaurantWhere, reservationDate: { gte: last30 } }, orderBy: [{ reservationDate: "desc" }, { startTime: "asc" }] }),
    prisma.guest.count({ where: { restaurant: reservationRestaurantWhere } }),
    prisma.restaurantPageEvent.count({ where: { type: "view", restaurant: reservationRestaurantWhere, createdAt: { gte: last30 } } }),
    prisma.restaurantPageEvent.count({ where: { type: "booking_click", restaurant: reservationRestaurantWhere, createdAt: { gte: last30 } } }),
  ]);

  const todayReservations = reservations.filter((reservation) => reservation.reservationDate >= today && reservation.reservationDate < tomorrow);
  const newRequests = reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.NEW).length;
  const activeStatuses = [RESERVATION_STATUSES.CONFIRMED, RESERVATION_STATUSES.SEATED, RESERVATION_STATUSES.COMPLETED] as string[];
  const confirmed = reservations.filter((reservation) => activeStatuses.includes(reservation.status));
  const noShowCount = reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length;
  const guestsToday = todayReservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.CONFIRMED || reservation.status === RESERVATION_STATUSES.SEATED).reduce((sum, reservation) => sum + reservation.guestsCount, 0);
  const conversionRate = percent(confirmed.length, reservations.length);
  const noShowRate = percent(noShowCount, reservations.length);
  const viewToBookingRate = percent(reservations.length, pageViews);
  const busiestHour = Object.entries(
    confirmed.reduce<Record<string, number>>((acc, reservation) => {
      const hour = reservation.startTime.slice(0, 2) + ":00";
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "пока нет данных";

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Кабинет ресторана</p>
        <h1>Сводка</h1>
        <p>Операционная картина для владельца: новые заявки, загрузка, гости, конверсия и точки роста.</p>
      </div>

      <section className="dashboard-grid">
        <div className="metric-card">
          <CalendarClock size={24} aria-hidden />
          <strong>{todayReservations.length}</strong>
          <span>броней сегодня</span>
        </div>
        <div className="metric-card">
          <MousePointerClick size={24} aria-hidden />
          <strong>{newRequests}</strong>
          <span>заявок ждут ответа</span>
        </div>
        <div className="metric-card">
          <UserRoundCheck size={24} aria-hidden />
          <strong>{guestsToday}</strong>
          <span>ожидаемая посадка сегодня</span>
        </div>
        <div className="metric-card">
          <BarChart3 size={24} aria-hidden />
          <strong>{conversionRate}%</strong>
          <span>конверсия в подтверждение</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Что система уже делает для вас</p>
            <h2>Коммерческий эффект</h2>
          </div>
          <Link className="button compact" href={restaurants[0] ? `/owner/restaurants/${restaurants[0].id}/analytics` : "/owner/restaurants/new"}>
            Открыть аналитику
          </Link>
        </div>
        <div className="value-grid">
          <div><strong>{reservations.length}</strong><span>броней пришло через систему за 30 дней</span></div>
          <div><strong>{confirmed.reduce((sum, reservation) => sum + reservation.guestsCount, 0)}</strong><span>гостей подтверждено или обслужено</span></div>
          <div><strong>{guestsCount}</strong><span>контактов гостей в CRM</span></div>
          <div><strong>{newRequests}</strong><span>потенциально не потеряно заявок</span></div>
          <div><strong>{busiestHour}</strong><span>самый загруженный час</span></div>
          <div><strong>{noShowRate}%</strong><span>Процент неявок за период</span></div>
          <div><strong>{pageViews}</strong><span>просмотров страниц ресторанов</span></div>
          <div><strong>{viewToBookingRate}%</strong><span>конверсия просмотра в бронь</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Мои рестораны</h2>
          <Link className="button compact" href="/owner/restaurants">Все рестораны</Link>
        </div>
        <div className="restaurant-admin-list compact">
          {restaurants.map((restaurant) => (
            <div className="restaurant-admin-row" key={restaurant.id}>
              <Link className="restaurant-admin-main restaurant-admin-link" href={`/owner/restaurants/${restaurant.id}/edit`}>
                <strong>{restaurant.title}</strong>
                <span>{restaurant.city}, {restaurant.address} · {formatMoney(restaurant.averageCheck)}</span>
              </Link>
              <Badge status={restaurant.status} />
              <div className="restaurant-admin-actions">
                <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/reservations`}>Брони {restaurant._count.reservations}</Link>
                <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/guests`}>Гости {restaurant._count.guests}</Link>
                <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/analytics`}>Аналитика</Link>
              </div>
            </div>
          ))}
          {!restaurants.length ? <div className="empty-state">Добавьте первый ресторан, чтобы начать принимать брони и собирать базу гостей.</div> : null}
        </div>
      </section>
    </div>
  );
}
