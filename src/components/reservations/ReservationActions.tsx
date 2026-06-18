"use client";

import { Check, CircleSlash, CreditCard, Flag, Link2, UserCheck, UserX, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOKING_ACTIONS, getAvailableActions, type BookingActionKey } from "@/lib/reservation-status";

const ICONS: Record<BookingActionKey, LucideIcon> = {
  confirm: Check,
  reject: X,
  mark_paid: CreditCard,
  request_confirmation: Link2,
  seated: UserCheck,
  cancel: CircleSlash,
  no_show: UserX,
  complete: Flag,
};

type Props = {
  reservationId: string;
  status: string;
  paymentRequired?: boolean;
  paymentStatus?: string | null;
  /** Whether the visit start time has arrived — gates «Гость не пришёл». */
  visitStarted?: boolean;
};

export function ReservationActions({ reservationId, status, paymentRequired, paymentStatus, visitStarted }: Props) {
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

  function handle(key: BookingActionKey) {
    const action = BOOKING_ACTIONS[key];
    if (action.kind === "mark_paid") return markPaid();
    if (action.kind === "request_confirmation") return requestConfirmation();
    return run(action.endpoint);
  }

  const actions = getAvailableActions({ status, paymentRequired, paymentStatus, visitStarted });
  if (!actions.length) return null;

  return (
    <div className="reservation-actions">
      {actions.map((key) => {
        const action = BOOKING_ACTIONS[key];
        const Icon = ICONS[key];
        return (
          <button
            className={`small-button icon-text${action.tone === "success" ? " success-action" : ""}`}
            key={key}
            type="button"
            disabled={pending !== null}
            onClick={() => handle(key)}
          >
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
