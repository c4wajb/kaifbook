import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Armchair, CalendarCheck, CheckCircle2, Clock3, MapPin, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ReservationQrCard } from "@/components/reservations/ReservationQrCard";
import { EXTERNAL_PAYMENT_STATUSES, PAYMENT_STATUSES, RESERVATION_STATUSES } from "@/lib/constants";
import { isClosedBooking } from "@/lib/reservation-status";
import { formatMoney, reservationDateLabel, statusLabel } from "@/lib/format";
import { acceptReservationByToken, cancelReservationByToken, getReservationByConfirmationToken } from "@/lib/public-reservation-confirmation";
import { reservationQrUrl } from "@/lib/reservation-qr";

type Props = { params: Promise<{ token: string }> };

function parseSeatNumbers(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).split(":seat-")[1] || String(item)) : [];
  } catch {
    return [];
  }
}

async function accept(token: string) {
  "use server";
  await acceptReservationByToken(token);
  revalidatePath(`/reservation/confirm/${token}`);
  redirect(`/reservation/confirm/${token}?done=accept`);
}

async function cancel(token: string) {
  "use server";
  await cancelReservationByToken(token);
  revalidatePath(`/reservation/confirm/${token}`);
  redirect(`/reservation/confirm/${token}?done=cancel`);
}

export default async function ReservationConfirmationPage({ params }: Props) {
  const { token } = await params;
  const reservation = await getReservationByConfirmationToken(token).catch(() => null);
  if (!reservation) notFound();

  const payment = reservation.payments[0] ?? null;
  const selectedSeats = parseSeatNumbers(reservation.selectedSeatNumbers);
  // Mirror the server guard (assertActionable) so the buttons never render for a
  // closed booking — includes payment_expired via the canonical helper.
  const canConfirm = !isClosedBooking(reservation.status);
  const paymentStatus = payment?.status === PAYMENT_STATUSES.PAID ? PAYMENT_STATUSES.PAID : reservation.paymentStatus;
  const paymentAmount = payment?.amount || reservation.paymentAmount || reservation.depositAmount || 0;
  const paymentUrl = payment?.paymentUrl || reservation.paymentUrl;
  const isPaid = paymentStatus === PAYMENT_STATUSES.PAID || paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT;
  const needsPayment = reservation.paymentRequired && !isPaid;
  const qrUrl = reservationQrUrl(reservation.confirmationToken);
  // Only ask the guest to confirm when the restaurant actually requested it —
  // right after booking it's redundant and off-putting.
  const confirmationRequested = Boolean(reservation.confirmationRequestedAt);

  return (
    <main className="reservation-confirm-page">
      <section className="reservation-pass-card">
        <Link className="booking-top-return reservation-pass-return" href={`/restaurants/${reservation.restaurant.slug}`} aria-label="Вернуться к ресторану">
          <span aria-hidden><ArrowLeft size={15} /></span>
          <span>К ресторану</span>
        </Link>
        <div className="reservation-pass-topline">
          <p className="eyebrow">{confirmationRequested ? "Подтверждение визита" : "Ваша бронь"}</p>
          <Badge status={reservation.status} />
        </div>

        <div className="reservation-pass-header">
          <div>
            <h1>{reservation.restaurant.title}</h1>
            <p>
              <MapPin size={16} aria-hidden />
              {reservation.restaurant.address}
            </p>
          </div>
          <div className="reservation-pass-status">
            <CheckCircle2 size={22} aria-hidden />
            <span>{reservation.guestConfirmedAt ? "Визит подтвержден" : statusLabel(reservation.status)}</span>
          </div>
        </div>

        <div className="reservation-pass-grid">
          <div className="reservation-pass-fact">
            <CalendarCheck size={20} aria-hidden />
            <strong>{reservationDateLabel(reservation.reservationDate)}</strong>
            <span>Дата</span>
          </div>
          <div className="reservation-pass-fact">
            <Clock3 size={20} aria-hidden />
            <strong>{reservation.startTime}-{reservation.endTime}</strong>
            <span>Время</span>
          </div>
          <div className="reservation-pass-fact">
            <Users size={20} aria-hidden />
            <strong>{reservation.guestsCount}</strong>
            <span>Количество гостей</span>
          </div>
          <div className="reservation-pass-fact">
            <Armchair size={20} aria-hidden />
            <strong>{reservation.table ? `Стол ${reservation.table.number}` : "Подберет ресторан"}</strong>
            <span>Стол</span>
          </div>
          {selectedSeats.length ? (
            <div className="reservation-pass-fact">
              <Armchair size={20} aria-hidden />
              <strong>{selectedSeats.join(", ")}</strong>
              <span>Места</span>
            </div>
          ) : null}
          <div className="reservation-pass-fact">
            <Phone size={20} aria-hidden />
            <strong>{reservation.customerPhone}</strong>
            <span>Телефон</span>
          </div>
        </div>

        <ReservationQrCard qrUrl={qrUrl} />

        <div className={`reservation-pass-note ${needsPayment ? "warning" : "success"}`}>
          <strong>{needsPayment ? `Нужно оплатить депозит ${formatMoney(paymentAmount)}` : statusLabel(paymentStatus)}</strong>
          <span>
            {needsPayment
              ? "Оплата проходит напрямую ресторану. После оплаты ресторан проверит платеж и подтвердит заявку."
              : confirmationRequested
                ? "Ресторан просит подтвердить визит, чтобы держать стол за вами."
                : "Депозит не нужен — бронь уже у ресторана. Ниже можно показать QR-код или отменить визит."}
          </span>
          {needsPayment && paymentUrl ? (
            <Link className="button full" href={paymentUrl} target="_blank" rel="noopener noreferrer">
              Оплатить депозит
            </Link>
          ) : null}
        </div>

        {reservation.status === RESERVATION_STATUSES.CANCELLED_BY_GUEST ? <p className="form-success">Заявка отменена. Ресторан уведомлён об отмене.</p> : null}
        {reservation.guestConfirmedAt ? <p className="form-success">Вы подтвердили визит. Ресторан видит это в кабинете.</p> : null}

        {canConfirm ? (
          <div className={`reservation-pass-actions ${confirmationRequested ? "" : "single"}`}>
            {confirmationRequested ? (
              <form action={accept.bind(null, token)}>
                <button className="button" type="submit">Я приду</button>
              </form>
            ) : null}
            <form action={cancel.bind(null, token)}>
              <button className="secondary-button" type="submit">Отменить визит</button>
            </form>
          </div>
        ) : null}

      </section>
    </main>
  );
}
