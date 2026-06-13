import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/Badge";
import { DateInput } from "@/components/DateInput";
import { OwnerTabs } from "@/components/OwnerTabs";
import { ReservationActions } from "@/components/ReservationActions";
import { ReservationSearchBox } from "@/components/ReservationSearchBox";
import { EXTERNAL_PAYMENT_STATUSES, RESERVATION_STATUSES, STAFF_ROLES, VERIFICATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { externalPaymentStatusLabel } from "@/lib/external-payments";
import { formatGuests, formatMoney, reservationDateLabel, statusLabel } from "@/lib/format";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canAccessRestaurant } from "@/lib/permissions";
import { dateFromInput } from "@/lib/time";
import { verificationBadgeLabel } from "@/lib/verifications";

type Props = {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ status?: string; date?: string; queue?: string; verification?: string }>;
};

type ReservationForList = Awaited<ReturnType<typeof getReservations>>[number];

const NEW_STATUSES = new Set<string>([
  RESERVATION_STATUSES.NEW,
  RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
]);

const CONFIRMED_STATUSES = new Set<string>([
  RESERVATION_STATUSES.CONFIRMED,
  RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
  RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
  RESERVATION_STATUSES.DEPOSIT_PAID,
  RESERVATION_STATUSES.SEATED,
]);

const CLOSED_STATUSES = new Set<string>([
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
  RESERVATION_STATUSES.REJECTED,
  RESERVATION_STATUSES.NO_SHOW,
  RESERVATION_STATUSES.PAYMENT_EXPIRED,
  RESERVATION_STATUSES.COMPLETED,
]);

const QUEUES = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "payment", label: "Ждут оплату" },
  { key: "paid", label: "Оплачены" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "risk", label: "Риск неявки" },
  { key: "closed", label: "Закрытые" },
] as const;

async function getReservations(restaurantId: string, filters: { status?: string; date?: string; verification?: string }) {
  const verificationWhere =
    filters.verification === "confirmed"
      ? { verificationStatus: VERIFICATION_STATUSES.CONFIRMED }
      : filters.verification === "unverified"
        ? { verificationStatus: null }
        : filters.verification === "max" || filters.verification === "vk"
          ? { verificationProvider: filters.verification, verificationStatus: VERIFICATION_STATUSES.CONFIRMED }
          : {};
  return prisma.reservation.findMany({
    where: {
      restaurantId,
      status: filters.status || undefined,
      reservationDate: filters.date ? dateFromInput(filters.date) : undefined,
      ...verificationWhere,
    },
    include: { hall: true, table: { include: { tableType: true } }, guest: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

function parseSeatNumbers(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).split(":seat-")[1] || String(item)) : [];
  } catch {
    return [];
  }
}

function safeToken(value: string) {
  return value.replaceAll("_", "-");
}

function reservationNeedsAttention(reservation: ReservationForList) {
  return (
    NEW_STATUSES.has(reservation.status) ||
    reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT
  );
}

function reservationPriority(reservation: ReservationForList) {
  if (NEW_STATUSES.has(reservation.status)) return 0;
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT) return 1;
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT && !CONFIRMED_STATUSES.has(reservation.status)) return 2;
  if (CONFIRMED_STATUSES.has(reservation.status)) return 3;
  if (reservation.status === RESERVATION_STATUSES.COMPLETED) return 4;
  if (CLOSED_STATUSES.has(reservation.status)) return 5;
  return 6;
}

function sortReservations(a: ReservationForList, b: ReservationForList) {
  const priorityDiff = reservationPriority(a) - reservationPriority(b);
  if (priorityDiff) return priorityDiff;

  if (NEW_STATUSES.has(a.status) && NEW_STATUSES.has(b.status)) {
    return b.createdAt.getTime() - a.createdAt.getTime();
  }

  const dateDiff = a.reservationDate.getTime() - b.reservationDate.getTime();
  if (dateDiff) return dateDiff;

  const timeDiff = a.startTime.localeCompare(b.startTime);
  if (timeDiff) return timeDiff;

  return b.createdAt.getTime() - a.createdAt.getTime();
}

function matchesQueue(reservation: ReservationForList, queue: string) {
  switch (queue) {
    case "new":
      return NEW_STATUSES.has(reservation.status);
    case "payment":
      return reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT;
    case "paid":
      return reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT;
    case "confirmed":
      return CONFIRMED_STATUSES.has(reservation.status);
    case "risk":
      return reservation.noShowRiskLevel === "high" || (reservation.guest?.noShowCount ?? 0) > 0;
    case "closed":
      return CLOSED_STATUSES.has(reservation.status);
    default:
      return true;
  }
}

function queueHref(restaurantId: string, filters: { status?: string; date?: string; queue?: string; verification?: string }, queue: string) {
  const params = new URLSearchParams();
  if (queue !== "all") params.set("queue", queue);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.verification) params.set("verification", filters.verification);
  const query = params.toString();
  return `/owner/restaurants/${restaurantId}/reservations${query ? `?${query}` : ""}`;
}

function reservationActionLabel(reservation: ReservationForList) {
  if (NEW_STATUSES.has(reservation.status)) return "Нужно подтвердить";
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT) return "Ждет оплату";
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT && !CONFIRMED_STATUSES.has(reservation.status)) return "Оплату отметили";
  if (reservation.status === RESERVATION_STATUSES.NO_SHOW) return "Гость не пришел";
  if (CLOSED_STATUSES.has(reservation.status)) return "Закрыта";
  return "В работе";
}

function reservationBadges(reservation: ReservationForList) {
  const badges: string[] = [];
  badges.push(verificationBadgeLabel(reservation.verificationProvider, reservation.verificationStatus));
  if (!reservation.paymentRequired) badges.push("Оплата не требуется");
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT) badges.push(`Ждет оплату ${formatMoney(reservation.paymentAmount)}`);
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT) badges.push("Оплачена ресторану");
  if (parseSeatNumbers(reservation.selectedSeatNumbers).length) badges.push("Выбраны места");
  if (reservation.guestConfirmedAt) badges.push("Гость подтвердил визит");
  if (reservation.noShowRiskLevel === "high") badges.push("Риск неявки");
  if ((reservation.guest?.noShowCount ?? 0) > 0) badges.push("Гость уже не приходил");
  if (reservation.table?.tableType?.code === "large") badges.push("Большой стол");
  return badges;
}

export default async function ReservationsPage({ params, searchParams }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const filters = await searchParams;
  const activeQueue = filters.queue || "all";
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();

  const allReservations = await getReservations(restaurantId, filters);
  const reservations = allReservations.filter((reservation) => matchesQueue(reservation, activeQueue)).sort(sortReservations);
  const attentionCount = allReservations.filter(reservationNeedsAttention).length;

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Брони и посадка</p>
        <h1>{restaurant.title}</h1>
        <p>Новые заявки и брони, которые ждут действия менеджера, теперь всегда показываются первыми.</p>
      </div>

      <OwnerTabs restaurantId={restaurant.id} isStaff={(STAFF_ROLES as readonly string[]).includes(user.role)} />

      <section className="panel owner-reservation-panel">
        <div className="owner-reservation-head">
          <div>
            <h2>Заявки на бронь</h2>
            <p>
              Всего: <strong>{allReservations.length}</strong>. Требуют внимания:{" "}
              <strong>{attentionCount}</strong>.
            </p>
          </div>
          <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/reservations`}>
            Сбросить фильтры
          </Link>
        </div>

        <nav className="reservation-filter-chips" aria-label="Фильтр заявок">
          {QUEUES.map((queue) => {
            const count = allReservations.filter((reservation) => matchesQueue(reservation, queue.key)).length;
            const isActive = activeQueue === queue.key;
            return (
              <Link
                key={queue.key}
                className={isActive ? "active" : ""}
                href={queueHref(restaurant.id, filters, queue.key)}
              >
                {queue.label}
                <span>{count}</span>
              </Link>
            );
          })}
        </nav>

        <ReservationSearchBox />

        <form className="owner-reservation-filters" action={`/owner/restaurants/${restaurant.id}/reservations`}>
          {activeQueue !== "all" ? <input type="hidden" name="queue" value={activeQueue} /> : null}
          <label>
            <span>Статус</span>
            <select name="status" defaultValue={filters.status || ""}>
              <option value="">Все статусы</option>
              {Object.values(RESERVATION_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <DateInput name="date" label="Дата визита" defaultValue={filters.date || ""} />
          <label>
            <span>Подтверждение</span>
            <select name="verification" defaultValue={filters.verification || ""}>
              <option value="">Любое</option>
              <option value="confirmed">Подтверждено</option>
              <option value="unverified">Без подтверждения</option>
              <option value="max">Через MAX</option>
              <option value="vk">Через VK</option>
            </select>
          </label>
          <button className="button" type="submit">
            Показать
          </button>
        </form>

        <div className="owner-reservation-list">
          {reservations.map((reservation) => {
            const selectedSeats = parseSeatNumbers(reservation.selectedSeatNumbers);
            return (
              <article
                className={`reservation-card status-${safeToken(reservation.status)} payment-${safeToken(reservation.paymentStatus)}${
                  reservationNeedsAttention(reservation) ? " needs-action" : ""
                }`}
                data-reservation-card
                data-search-name={reservation.customerName}
                data-search-phone={reservation.customerPhone}
                key={reservation.id}
              >
                <div className="reservation-card-top">
                  <div>
                    <span className="reservation-action-label">{reservationActionLabel(reservation)}</span>
                    <h3>
                      {reservation.customerName} · {formatGuests(reservation.guestsCount)}
                    </h3>
                    <p>
                      Создана {reservationDateLabel(reservation.createdAt)} · {reservation.customerPhone}
                    </p>
                  </div>
                  <Badge status={reservation.status}>{statusLabel(reservation.status)}</Badge>
                </div>

                <div className="reservation-meta-grid">
                  <div>
                    <span>Дата и время</span>
                    <strong>
                      {reservationDateLabel(reservation.reservationDate)} · {reservation.startTime}-{reservation.endTime}
                    </strong>
                  </div>
                  <div>
                    <span>Стол</span>
                    <strong>{reservation.table ? `Стол ${reservation.table.number}` : "Не выбран"}</strong>
                  </div>
                  <div>
                    <span>Зал</span>
                    <strong>{reservation.hall?.title || "Не указан"}</strong>
                  </div>
                  <div>
                    <span>Оплата</span>
                    <strong>
                      {externalPaymentStatusLabel(reservation.paymentStatus)}
                      {reservation.paymentRequired ? ` · ${formatMoney(reservation.paymentAmount)}` : ""}
                    </strong>
                  </div>
                  <div>
                    <span>Подтверждение</span>
                    <strong>{verificationBadgeLabel(reservation.verificationProvider, reservation.verificationStatus)}</strong>
                  </div>
                  {reservation.contactPhoneFromProvider ? (
                    <div>
                      <span>Телефон из VK</span>
                      <strong>{reservation.contactPhoneFromProvider}</strong>
                    </div>
                  ) : null}
                </div>

                {reservation.table?.tableType ? (
                  <p className="reservation-card-note">Тип стола: {reservation.table.tableType.title}</p>
                ) : null}
                {selectedSeats.length ? <p className="reservation-card-note">Места: {selectedSeats.join(", ")}</p> : null}
                {reservation.pricingExplanation ? <p className="reservation-card-note">{reservation.pricingExplanation}</p> : null}
                {reservation.comment ? <p className="reservation-card-comment">{reservation.comment}</p> : null}

                <div className="tag-row">
                  {reservationBadges(reservation).map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>

                <div className="reservation-card-footer">
                  <div className="reservation-card-links">
                    {reservation.paymentUrl ? (
                      <Link className="small-button" href={reservation.paymentUrl} target="_blank" rel="noopener noreferrer">
                        Платежная ссылка ресторана
                      </Link>
                    ) : null}
                    {reservation.guest ? (
                      <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/guests/${reservation.guest.id}`}>
                        Карточка гостя
                      </Link>
                    ) : null}
                  </div>
                  <ReservationActions
                    reservationId={reservation.id}
                    status={reservation.status}
                    paymentRequired={reservation.paymentRequired}
                    paymentStatus={reservation.paymentStatus}
                  />
                </div>
              </article>
            );
          })}
        </div>

        {!reservations.length ? <div className="empty-state">По выбранным условиям заявок нет.</div> : null}
      </section>
    </div>
  );
}
