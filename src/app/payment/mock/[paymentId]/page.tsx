import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney, reservationDateLabel } from "@/lib/format";
import { markPaymentPaid } from "@/lib/payments";

type Props = { params: Promise<{ paymentId: string }>; searchParams: Promise<{ returnUrl?: string; description?: string }> };

async function markPaid(paymentId: string) {
  "use server";
  await markPaymentPaid(paymentId);
  revalidatePath(`/payment/mock/${paymentId}`);
}

function parseSeatNumbers(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function MockPaymentPage({ params, searchParams }: Props) {
  const { paymentId } = await params;
  const query = await searchParams;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      reservation: {
        include: {
          restaurant: { select: { title: true, slug: true } },
          hall: true,
          table: { include: { tableType: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  const reservation = payment.reservation;
  const returnUrl = query.returnUrl || (reservation.confirmationToken ? `/reservation/confirm/${reservation.confirmationToken}` : `/restaurants/${reservation.restaurant.slug}`);
  const selectedSeats = parseSeatNumbers(reservation.selectedSeatNumbers);

  return (
    <main className="page narrow-page">
      <section className="panel stack-form payment-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Демо-оплата</p>
            <h1>{formatMoney(payment.amount)}</h1>
            <p>{query.description || `Депозит за стол в ${reservation.restaurant.title}`}</p>
          </div>
          <Badge status={payment.status} />
        </div>

        <div className="payment-demo-badge">Демо-оплата: реальные деньги не списываются</div>

        <div className="payment-details-grid">
          <span>Ресторан</span>
          <strong>{reservation.restaurant.title}</strong>
          <span>Дата и время</span>
          <strong>{reservationDateLabel(reservation.reservationDate)} · {reservation.startTime}-{reservation.endTime}</strong>
          <span>Количество гостей</span>
          <strong>{reservation.guestsCount}</strong>
          <span>Стол</span>
          <strong>{reservation.table ? `№ ${reservation.table.number}${reservation.table.tableType ? ` · ${reservation.table.tableType.title}` : ""}` : "Подберёт менеджер"}</strong>
          {reservation.hall ? (
            <>
              <span>Зал</span>
              <strong>{reservation.hall.title}</strong>
            </>
          ) : null}
          {selectedSeats.length ? (
            <>
              <span>Выбранные места</span>
              <strong>{selectedSeats.map((seat) => seat.split(":seat-")[1] || seat).join(", ")}</strong>
            </>
          ) : null}
          <span>Статус заявки</span>
          <strong>{reservation.status}</strong>
        </div>

        <p className="info-note">
          Для выбранного стола ресторан просит депозит. Это помогает подтвердить визит и снизить риск неявки. В реальном запуске ссылка будет создаваться официальным платежным провайдером, а не переводом на карту.
        </p>

        {payment.status === PAYMENT_STATUSES.PAID ? (
          <div className="booking-link-box soft-box">
            <strong>Депозит получен</strong>
            <span>Статус заявки обновлён: оплата прошла, ресторан увидит подтверждение.</span>
            <Link className="button client-cta" href={returnUrl}>Вернуться к заявке</Link>
          </div>
        ) : payment.status === PAYMENT_STATUSES.EXPIRED ? (
          <div className="booking-link-box">
            <strong>Время на оплату истекло</strong>
            <span>Стол не был закреплён. Можно создать новую заявку на странице ресторана.</span>
            <Link className="button client-cta" href={`/restaurants/${reservation.restaurant.slug}`}>Открыть ресторан</Link>
          </div>
        ) : (
          <form action={markPaid.bind(null, payment.id)}>
            <button className="button full client-cta" type="submit">Оплатить депозит в демо-режиме</button>
          </form>
        )}
      </section>
    </main>
  );
}
