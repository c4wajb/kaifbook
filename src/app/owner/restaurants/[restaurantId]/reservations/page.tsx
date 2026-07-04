import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { OwnerTabs } from "@/components/admin/OwnerTabs";
import { ReservationActions } from "@/components/reservations/ReservationActions";
import { ReservationSearchBox } from "@/components/reservations/ReservationSearchBox";
import { EXTERNAL_PAYMENT_STATUSES, STAFF_ROLES, VERIFICATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { externalPaymentStatusLabel } from "@/lib/external-payments";
import { formatGuests, formatMoney, reservationDateLabel, statusLabel } from "@/lib/format";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canAccessRestaurant } from "@/lib/permissions";
import { ACTIVE_STATUSES, BOOKING_TABS, getBookingPhase, getBookingPhaseLabel, getBookingTab, type BookingPhase } from "@/lib/reservation-status";
import { dateFromInput, dayOfWeekFromDate, resolveVisitInstant } from "@/lib/time";
import { verificationBadgeLabel } from "@/lib/verifications";

type Props = {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ date?: string; tab?: string; verification?: string; risk?: string }>;
};

type ReservationForList = Awaited<ReturnType<typeof getActiveReservations>>[number];

// Only fetch live bookings — closed/terminal statuses live in «История броней».
async function getActiveReservations(restaurantId: string, filters: { date?: string; verification?: string }) {
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
      status: { in: ACTIVE_STATUSES },
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

function isAwaitingPayment(reservation: ReservationForList) {
  return reservation.paymentRequired && reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT;
}

function reservationHasRisk(reservation: ReservationForList) {
  return reservation.noShowRiskLevel === "high" || (reservation.guest?.noShowCount ?? 0) > 0;
}

function reservationNeedsAttention(reservation: ReservationForList) {
  return getBookingPhase(reservation.status) === "needs_confirmation" || isAwaitingPayment(reservation);
}

const PHASE_PRIORITY: Record<BookingPhase, number> = { needs_confirmation: 0, awaiting_payment: 1, confirmed: 2, seated: 3, closed: 4 };

function sortReservations(a: ReservationForList, b: ReservationForList) {
  const priorityDiff = PHASE_PRIORITY[getBookingPhase(a.status)] - PHASE_PRIORITY[getBookingPhase(b.status)];
  if (priorityDiff) return priorityDiff;

  if (getBookingPhase(a.status) === "needs_confirmation" && getBookingPhase(b.status) === "needs_confirmation") {
    return b.createdAt.getTime() - a.createdAt.getTime();
  }
  const dateDiff = a.reservationDate.getTime() - b.reservationDate.getTime();
  if (dateDiff) return dateDiff;
  const timeDiff = a.startTime.localeCompare(b.startTime);
  if (timeDiff) return timeDiff;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function tabHref(restaurantId: string, filters: { date?: string; verification?: string; risk?: string }, tab: string) {
  const params = new URLSearchParams();
  if (tab !== BOOKING_TABS[0].key) params.set("tab", tab);
  if (filters.date) params.set("date", filters.date);
  if (filters.verification) params.set("verification", filters.verification);
  if (filters.risk) params.set("risk", filters.risk);
  const query = params.toString();
  return `/owner/restaurants/${restaurantId}/reservations${query ? `?${query}` : ""}`;
}

function reservationBadges(reservation: ReservationForList) {
  const badges: string[] = [];
  badges.push(verificationBadgeLabel(reservation.verificationProvider, reservation.verificationStatus));
  if (!reservation.paymentRequired) badges.push("Оплата не требуется");
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT) badges.push(`Ждёт оплату ${formatMoney(reservation.paymentAmount)}`);
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
  const tab = getBookingTab(filters.tab);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { workingHours: true } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();

  const allActive = await getActiveReservations(restaurantId, filters);
  const tabMatches = allActive.filter((reservation) => tab.phases.includes(getBookingPhase(reservation.status)));
  const reservations = (filters.risk === "1" ? tabMatches.filter(reservationHasRisk) : tabMatches).sort(sortReservations);
  const attentionCount = allActive.filter(reservationNeedsAttention).length;
  const now = Date.now();

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Брони и посадка</p>
        <h1>{restaurant.title}</h1>
        <p>Новые заявки показываются первыми. Завершённые, отменённые и неявки — в разделе «История броней».</p>
      </div>

      <OwnerTabs restaurantId={restaurant.id} isStaff={(STAFF_ROLES as readonly string[]).includes(user.role)} />

      <section className="panel owner-reservation-panel">
        <div className="owner-reservation-head">
          <div>
            <h2>{tab.title}</h2>
            <p>
              {tab.subtitle}
              {attentionCount ? <> · требуют внимания: <strong>{attentionCount}</strong></> : null}
            </p>
          </div>
          <Link className="small-button" href={`/owner/restaurants/${restaurant.id}/reservations`}>
            Сбросить фильтры
          </Link>
        </div>

        <nav className="reservation-filter-chips" aria-label="Этап брони">
          {BOOKING_TABS.map((item) => {
            const count = allActive.filter((reservation) => item.phases.includes(getBookingPhase(reservation.status))).length;
            return (
              <Link key={item.key} className={tab.key === item.key ? "active" : ""} href={tabHref(restaurant.id, filters, item.key)}>
                {item.label}
                <span>{count}</span>
              </Link>
            );
          })}
        </nav>

        <ReservationSearchBox />

        <form className="owner-reservation-filters" action={`/owner/restaurants/${restaurant.id}/reservations`}>
          {tab.key !== BOOKING_TABS[0].key ? <input type="hidden" name="tab" value={tab.key} /> : null}
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
          <label className="reservation-risk-toggle">
            <input type="checkbox" name="risk" value="1" defaultChecked={filters.risk === "1"} />
            <span>Только с риском неявки</span>
          </label>
          <button className="button" type="submit">
            Показать
          </button>
        </form>

        <div className="owner-reservation-list">
          {reservations.map((reservation) => {
            const selectedSeats = parseSeatNumbers(reservation.selectedSeatNumbers);
            // Pass the day's working hour so after-midnight slots at overnight
            // venues resolve on the correct calendar day (not ~24h early).
            const workingHour = restaurant.workingHours.find((hour) => hour.dayOfWeek === dayOfWeekFromDate(reservation.reservationDate)) ?? null;
            const visitStarted = now >= resolveVisitInstant(reservation.reservationDate, reservation.startTime, workingHour).getTime();
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
                    <span className="reservation-action-label">{getBookingPhaseLabel(reservation.status)}</span>
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
                    visitStarted={visitStarted}
                  />
                </div>
              </article>
            );
          })}
        </div>

        {!reservations.length ? (
          <div className="empty-state">
            <strong>{tab.emptyTitle}</strong>
            <span>{filters.risk === "1" ? "С риском неявки в этой вкладке броней нет." : tab.emptyHint}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
