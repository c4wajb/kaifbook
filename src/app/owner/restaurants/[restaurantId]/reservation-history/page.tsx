import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { OwnerTabs } from "@/components/admin/OwnerTabs";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { externalPaymentStatusLabel } from "@/lib/external-payments";
import { formatMoney, reservationDateLabel, statusLabel } from "@/lib/format";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canAccessRestaurant } from "@/lib/permissions";
import { dateFromInput } from "@/lib/time";

type Props = {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ q?: string; from?: string; to?: string; status?: string; guests?: string; sort?: string }>;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function sourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    web: "Сайт",
    manual: "Вручную",
    phone: "Телефон",
    widget: "Виджет",
  };
  return labels[source || ""] || source || "Не указан";
}

function matchesSearch(
  reservation: { customerName: string; customerPhone: string; guest: { name: string; phone: string } | null },
  query: string,
) {
  const text = normalizeText(query);
  const digits = normalizePhone(query);
  if (!text) return true;

  const nameMatch = normalizeText(`${reservation.customerName} ${reservation.guest?.name || ""}`).includes(text);
  const phone = normalizePhone(`${reservation.customerPhone} ${reservation.guest?.phone || ""}`);
  const phoneMatch = digits.length > 0 && phone.includes(digits);
  return nameMatch || phoneMatch;
}

export default async function ReservationHistoryPage({ params, searchParams }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const filters = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();

  const guestsCount = Number(filters.guests || 0);
  const dateFilter = {
    ...(filters.from ? { gte: dateFromInput(filters.from) } : {}),
    ...(filters.to ? { lte: dateFromInput(filters.to) } : {}),
  };

  const rawReservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      status: filters.status || undefined,
      guestsCount: guestsCount > 0 ? guestsCount : undefined,
      reservationDate: Object.keys(dateFilter).length ? dateFilter : undefined,
    },
    include: { guest: true, hall: true, table: true },
  });

  const sortAsc = filters.sort === "asc";
  const reservations = rawReservations
    .filter((reservation) => matchesSearch(reservation, filters.q || ""))
    .sort((a, b) => {
      const dateDiff = a.reservationDate.getTime() - b.reservationDate.getTime();
      if (dateDiff) return sortAsc ? dateDiff : -dateDiff;
      const timeDiff = a.startTime.localeCompare(b.startTime);
      if (timeDiff) return sortAsc ? timeDiff : -timeDiff;
      return sortAsc ? a.createdAt.getTime() - b.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime();
    });

  const hasFilters = Boolean(filters.q || filters.from || filters.to || filters.status || filters.guests || filters.sort === "asc");

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Архив ресторана</p>
        <h1>{restaurant.title}</h1>
        <p>Полная история заявок: от новых броней до отмен, завершенных визитов и неявок.</p>
      </div>

      <OwnerTabs restaurantId={restaurant.id} />

      <section className="panel reservation-history-panel">
        <div className="section-heading">
          <div>
            <h2>История броней</h2>
            <p className="muted">Показано {reservations.length} из {rawReservations.length} записей.</p>
          </div>
          {hasFilters ? (
            <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/reservation-history`}>
              Сбросить фильтры
            </Link>
          ) : null}
        </div>

        <form className="reservation-history-filters" action={`/owner/restaurants/${restaurant.id}/reservation-history`}>
          <label className="history-search">
            <span>Поиск</span>
            <input name="q" defaultValue={filters.q || ""} placeholder="Гость или телефон" />
          </label>
          <DateInput name="from" label="Дата от" defaultValue={filters.from || ""} />
          <DateInput name="to" label="Дата до" defaultValue={filters.to || ""} />
          <label>
            <span>Статус</span>
            <select name="status" defaultValue={filters.status || ""}>
              <option value="">Все статусы</option>
              {Object.values(RESERVATION_STATUSES).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Количество гостей</span>
            <input type="number" min="1" name="guests" defaultValue={filters.guests || ""} placeholder="Любое" />
          </label>
          <label>
            <span>Сортировка</span>
            <select name="sort" defaultValue={filters.sort || "desc"}>
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>
          </label>
          <button className="button" type="submit">Показать</button>
        </form>

        <div className="reservation-history-list">
          {reservations.map((reservation) => (
            <article className="history-row" key={reservation.id}>
              <div className="history-main">
                <strong>{reservationDateLabel(reservation.reservationDate)} · {reservation.startTime}-{reservation.endTime}</strong>
                <p>{reservation.customerName} · {reservation.customerPhone}</p>
                <p>{reservation.hall?.title || "Зал не указан"}{reservation.table ? ` · стол ${reservation.table.number}` : " · стол не выбран"}</p>
              </div>
              <div>
                <span className="history-label">Гости</span>
                <strong>{reservation.guestsCount}</strong>
              </div>
              <div>
                <span className="history-label">Оплата</span>
                <strong>{reservation.paymentRequired ? `${externalPaymentStatusLabel(reservation.paymentStatus)} · ${formatMoney(reservation.paymentAmount)}` : "Не требуется"}</strong>
              </div>
              <div>
                <span className="history-label">Источник</span>
                <strong>{sourceLabel(reservation.source)}</strong>
              </div>
              <div>
                <span className="history-label">Создана</span>
                <strong>{reservationDateLabel(reservation.createdAt)}</strong>
              </div>
              <div className="history-status">
                <Badge status={reservation.status}>{statusLabel(reservation.status)}</Badge>
              </div>
              {reservation.comment || reservation.occasion ? (
                <p className="history-comment">{reservation.occasion || ""}{reservation.occasion && reservation.comment ? " · " : ""}{reservation.comment || ""}</p>
              ) : null}
            </article>
          ))}
        </div>

        {!rawReservations.length ? (
          <div className="empty-state"><strong>История броней пока пустая</strong></div>
        ) : null}
        {rawReservations.length && !reservations.length ? (
          <div className="empty-state">
            <strong>Брони не найдены</strong>
            <span>Попробуйте изменить период, статус или поисковый запрос.</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
