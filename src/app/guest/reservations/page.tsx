import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Clock3, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/Badge";
import { DateInput } from "@/components/DateInput";
import { LogoutButton } from "@/components/LogoutButton";
import { ReservationQrCard } from "@/components/ReservationQrCard";
import { getCurrentUser } from "@/lib/auth";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney, reservationDateLabel, statusLabel } from "@/lib/format";
import { reservationQrUrl } from "@/lib/reservation-qr";
import { dateInputValue, timeToMinutes } from "@/lib/time";

type Props = {
  searchParams: Promise<{
    view?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

type GuestReservationItem = {
  reservationDate: Date;
  startTime: string;
  endTime: string;
  status: string;
};

const ARCHIVE_STATUSES = new Set<string>([
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
  RESERVATION_STATUSES.PAYMENT_EXPIRED,
  RESERVATION_STATUSES.REJECTED,
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.COMPLETED,
  RESERVATION_STATUSES.NO_SHOW,
]);

function parseSeats(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).split(":seat-")[1] || String(item)) : [];
  } catch {
    return [];
  }
}

function validDateFilter(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function reservationEndDate(reservation: GuestReservationItem) {
  const date = dateInputValue(reservation.reservationDate);
  const endDate = new Date(`${date}T${reservation.endTime}:00+03:00`);

  try {
    const startMinutes = timeToMinutes(reservation.startTime);
    const endMinutes = timeToMinutes(reservation.endTime);
    if (endMinutes <= startMinutes) endDate.setDate(endDate.getDate() + 1);
  } catch {
    return new Date(`${date}T23:59:59+03:00`);
  }

  return endDate;
}

function isArchivedReservation(reservation: GuestReservationItem) {
  return ARCHIVE_STATUSES.has(reservation.status) || reservationEndDate(reservation).getTime() < Date.now();
}

function matchesDateFilter(reservation: GuestReservationItem, dateFrom: string, dateTo: string) {
  const reservationDate = dateInputValue(reservation.reservationDate);
  return (!dateFrom || reservationDate >= dateFrom) && (!dateTo || reservationDate <= dateTo);
}

function listHref(view: "active" | "history", dateFrom = "", dateTo = "") {
  const params = new URLSearchParams();
  if (view === "history") params.set("view", "history");
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  const query = params.toString();
  return `/guest/reservations${query ? `?${query}` : ""}`;
}

export default async function GuestReservationsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "customer" || !user.phone) {
    redirect("/guest/login?next=/guest/reservations");
  }

  const params = await searchParams;
  const view = params.view === "history" ? "history" : "active";
  const dateFrom = validDateFilter(params.dateFrom);
  const dateTo = validDateFilter(params.dateTo);

  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { userId: user.id },
        { customerPhone: user.phone },
      ],
    },
    include: {
      restaurant: { select: { title: true, slug: true, address: true, phone: true } },
      table: { select: { number: true } },
    },
    orderBy: [{ reservationDate: "desc" }, { startTime: "desc" }],
  });

  const activeReservations = reservations
    .filter((reservation) => !isArchivedReservation(reservation))
    .sort((a, b) => reservationEndDate(a).getTime() - reservationEndDate(b).getTime());
  const archivedReservations = reservations
    .filter(isArchivedReservation)
    .sort((a, b) => reservationEndDate(b).getTime() - reservationEndDate(a).getTime());
  const currentReservations = (view === "history" ? archivedReservations : activeReservations)
    .filter((reservation) => matchesDateFilter(reservation, dateFrom, dateTo));
  const hasDateFilter = Boolean(dateFrom || dateTo);

  return (
    <main className="guest-reservations-page">
      <section className="guest-reservations-hero">
        <div>
          <p className="eyebrow">Личный кабинет гостя</p>
          <h1>Мои брони</h1>
          <p>Актуальные заявки показаны отдельно. Прошедшие и завершенные визиты лежат в истории, чтобы их было проще найти.</p>
        </div>
        <div className="guest-account-chip">
          <Phone size={16} aria-hidden />
          {user.phone}
          <LogoutButton />
        </div>
      </section>

      <section className="guest-reservation-tools" aria-label="Фильтры броней">
        <nav className="guest-reservation-tabs" aria-label="Разделы броней">
          <Link className={view === "active" ? "is-active" : ""} href={listHref("active", dateFrom, dateTo)}>
            Актуальные <span>{activeReservations.length}</span>
          </Link>
          <Link className={view === "history" ? "is-active" : ""} href={listHref("history", dateFrom, dateTo)}>
            История <span>{archivedReservations.length}</span>
          </Link>
        </nav>

        <form className="guest-reservation-date-filter" action="/guest/reservations">
          {view === "history" ? <input type="hidden" name="view" value="history" /> : null}
          <DateInput name="dateFrom" label="Дата от" defaultValue={dateFrom} />
          <DateInput name="dateTo" label="Дата до" defaultValue={dateTo} />
          <button className="small-button" type="submit">Показать</button>
          {hasDateFilter ? (
            <Link className="small-button secondary" href={listHref(view)}>
              Сбросить даты
            </Link>
          ) : null}
        </form>
      </section>

      {currentReservations.length ? (
        <section className="guest-reservation-grid">
          {currentReservations.map((reservation) => {
            const seats = parseSeats(reservation.selectedSeatNumbers);
            const restaurantHref = reservation.restaurant.slug ? `/restaurants/${reservation.restaurant.slug}` : null;
            return (
              <article className="guest-reservation-card" key={reservation.id}>
                <div className="guest-reservation-head">
                  <div>
                    <h2>
                      {restaurantHref ? (
                        <Link className="guest-reservation-restaurant-title" href={restaurantHref}>
                          {reservation.restaurant.title}
                        </Link>
                      ) : (
                        reservation.restaurant.title
                      )}
                    </h2>
                    <p><MapPin size={15} aria-hidden /> {reservation.restaurant.address}</p>
                  </div>
                  <Badge status={reservation.status} />
                </div>

                <div className="guest-reservation-facts">
                  <span><CalendarCheck size={16} aria-hidden /> {reservationDateLabel(reservation.reservationDate)}</span>
                  <span><Clock3 size={16} aria-hidden /> {reservation.startTime}-{reservation.endTime}</span>
                  <span>{reservation.guestsCount} чел.</span>
                  <span>{reservation.table ? `Стол ${reservation.table.number}` : "Стол подберет ресторан"}</span>
                  {seats.length ? <span>Места: {seats.join(", ")}</span> : null}
                </div>

                <div className="guest-payment-line">
                  <strong>{statusLabel(reservation.paymentStatus)}</strong>
                  {reservation.paymentAmount > 0 ? <span>{formatMoney(reservation.paymentAmount)}</span> : <span>Без оплаты при бронировании</span>}
                </div>

                <ReservationQrCard
                  compact
                  qrUrl={reservationQrUrl(reservation.confirmationToken)}
                  title="QR для ресторана"
                  description="В QR-коде есть краткая информация о брони: стол, места, имя и телефон."
                />

                {reservation.confirmationToken ? (
                  <div className="guest-reservation-actions">
                    <Link className="button" href={`/reservation/confirm/${reservation.confirmationToken}`}>Открыть бронь</Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="guest-empty-state">
          {reservations.length ? (
            <>
              <h2>{view === "history" ? "Брони не найдены" : "Актуальных броней нет"}</h2>
              <p>{view === "history" ? "Попробуйте изменить период или вернуться к актуальным броням." : "Прошедшие и завершенные визиты можно посмотреть в истории."}</p>
            </>
          ) : (
            <>
              <h2>Пока нет броней</h2>
              <p>Когда вы отправите заявку на сайте, она появится здесь после привязки к телефону.</p>
            </>
          )}
          <Link className="button" href="/restaurants">Выбрать ресторан</Link>
        </section>
      )}
    </main>
  );
}
