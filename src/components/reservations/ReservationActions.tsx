"use client";

import { Check, CircleSlash, CreditCard, Flag, Link2, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EXTERNAL_PAYMENT_STATUSES } from "@/lib/constants";

const ACTIONS = [
  { status: "confirmed", endpoint: "confirm", label: "Подтвердить", icon: Check },
  { status: "seated", endpoint: "seated", label: "Посадить", icon: UserCheck },
  { status: "rejected", endpoint: "reject", label: "Отклонить", icon: X },
  { status: "cancelled", endpoint: "cancel", label: "Отменить", icon: CircleSlash },
  { status: "completed", endpoint: "complete", label: "Завершить", icon: Flag },
  { status: "no_show", endpoint: "no-show", label: "Гость не пришел", icon: X },
] as const;

type Props = {
  reservationId: string;
  status: string;
  paymentRequired?: boolean;
  paymentStatus?: string | null;
};

export function ReservationActions({ reservationId, status, paymentRequired, paymentStatus }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(endpoint: string) {
    setPending(endpoint);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/owner/reservations/${reservationId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: endpoint === "reject" ? JSON.stringify({ rejectionReason: "Отклонено рестораном" }) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось изменить статус заявки.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  async function requestConfirmation() {
    setPending("request-confirmation");
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/owner/reservations/${reservationId}/request-confirmation`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Не удалось создать ссылку подтверждения.");
      setPending(null);
      return;
    }
    setNotice(`Ссылка для гостя: ${data.confirmationUrl}`);
    setPending(null);
    router.refresh();
  }

  async function markPaid() {
    setPending("mark-payment-paid");
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/owner/reservations/${reservationId}/mark-payment-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "Оплата проверена рестораном" }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось отметить оплату.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  const awaitingRestaurantPayment = paymentRequired && paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT;

  return (
    <div className="reservation-actions">
      <button className="small-button icon-text" type="button" disabled={pending !== null} onClick={requestConfirmation}>
        <Link2 size={15} aria-hidden />
        Ссылка гостю
      </button>
      {awaitingRestaurantPayment ? (
        <button className="small-button icon-text success-action" type="button" disabled={pending !== null} onClick={markPaid}>
          <CreditCard size={15} aria-hidden />
          Отметить оплату
        </button>
      ) : null}
      {ACTIONS.filter((action) => action.status !== status).map((action) => {
        const Icon = action.icon;
        return (
          <button className="small-button icon-text" key={action.endpoint} type="button" disabled={pending !== null} onClick={() => run(action.endpoint)}>
            <Icon size={15} aria-hidden />
            {action.label}
          </button>
        );
      })}
      {notice ? <p className="form-success compact-error">{notice}</p> : null}
      {error ? <p className="form-error compact-error">{error}</p> : null}
    </div>
  );
}
