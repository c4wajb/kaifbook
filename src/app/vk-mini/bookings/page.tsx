import Link from "next/link";
import { CalendarCheck, Clock3, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { GuestLoginForm } from "@/components/guest/GuestLoginForm";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ReservationQrCard } from "@/components/reservations/ReservationQrCard";
import { VkMiniAppShell } from "@/components/vk/VkMiniAppShell";
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
  return `/vk-mini/bookings${query ? `?${query}` : ""}`;
}

export default async function VkMiniBookingsPage({ searchParams }: Props) {
  const user = await getCurrentUser();

  if (!user || user.role !== "customer" || !user.phone) {
    return (
      <VkMiniAppShell active="bookings">
        <GuestLoginForm closePath="/vk-mini" nextPath="/vk-mini/bookings" />
      </VkMiniAppShell>
    );
  }

  const params = await searchParams;
  const view = params.view === "history" ? "history" : "active";
  const dateFrom = validDateFilter(params.dateFrom);
  const dateTo = validDateFilter(params.dateTo);

  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [{ userId: user.id }, { customerPhone: user.phone }],
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
    <VkMiniAppShell active="bookings">
      <section className="vk-mini-section vk-mini-account-head">
        <div>
          <p className="eyebrow">Личный кабинет гостя</p>
          <h1>Мои брони</h1>
          <p>Сначала показываем актуальные заявки. Прошедшие визиты можно открыть в истории.</p>
        </div>
        <div className="guest-account-chip">
          <Phone size={16} aria-hidden />
          {user.phone}
          <LogoutButton />
        </div>
      </section>

      <section className="guest-reservation-tools vk-mini-section" aria-label="Фильтры броней">
        <nav className="guest-reservation-tabs" aria-label="Разделы броней">
          <Link className={view === "active" ? "is-active" : ""} href={listHref("active", dateFrom, dateTo)}>
            Актуальные <span>{activeReservations.length}</span>
          </Link>
          <Link className={view === "history" ? "is-active" : ""} href={listHref("history", dateFrom, dateTo)}>
            История <span>{archivedReservations.length}</span>
          </Link>
        </nav>

        <form className="guest-reservation-date-filter" action="/vk-mini/bookings">
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
        <section className="guest-reservation-grid vk-mini-booking-list">
          {currentReservations.map((reservation) => {
            const seats = parseSeats(reservation.selectedSeatNumbers);
            const restaurantHref = reservation.restaurant.slug ? `/vk-mini/restaurants/${reservation.restaurant.slug}` : null;
            return (
              <article className="guest-reservation-card vk-mini-reservation-card" key={reservation.id}>
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
                  description="Покажите QR в ресторане для быстрой проверки заявки."
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
        <section className="guest-empty-state vk-mini-empty">
          {reservations.length ? (
            <>
              <h2>{view === "history" ? "Брони не найдены" : "Актуальных броней нет"}</h2>
              <p>{view === "history" ? "Попробуйте изменить период или открыть актуальные брони." : "Прошедшие и завершенные заявки лежат в истории."}</p>
            </>
          ) : (
            <>
              <h2>Пока нет броней</h2>
              <p>Когда вы отправите заявку, она появится здесь после привязки к телефону.</p>
            </>
          )}
          <Link className="button" href="/vk-mini">Выбрать ресторан</Link>
        </section>
      )}
    </VkMiniAppShell>
  );
}
