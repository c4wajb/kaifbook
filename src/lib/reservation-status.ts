/**
 * Booking lifecycle — the single source of truth for "what phase is a booking
 * in, and what can a manager do with it".
 *
 * Design: the stored `status` describes ONLY the lifecycle. Payment
 * (`paymentStatus`) and no-show risk (`noShowRiskLevel`) are separate signals
 * shown as badges, never as lifecycle states. The DB already stores these
 * separately, so this module normalizes the many granular statuses into a few
 * conceptual phases instead of migrating data.
 *
 * Pure + dependency-light (constants only) so it is safe on server and client
 * and easy to unit-test.
 */
import { EXTERNAL_PAYMENT_STATUSES, RESERVATION_STATUSES } from "@/lib/constants";

/** Conceptual lifecycle phase a booking is in. */
export type BookingPhase = "needs_confirmation" | "awaiting_payment" | "confirmed" | "seated" | "closed";

const PHASE_BY_STATUS: Record<string, BookingPhase> = {
  [RESERVATION_STATUSES.NEW]: "needs_confirmation",
  [RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION]: "needs_confirmation",
  [RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT]: "awaiting_payment",
  [RESERVATION_STATUSES.DEPOSIT_PAID]: "confirmed",
  [RESERVATION_STATUSES.CONFIRMED]: "confirmed",
  [RESERVATION_STATUSES.CONFIRMED_BY_GUEST]: "confirmed",
  [RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT]: "confirmed",
  [RESERVATION_STATUSES.SEATED]: "seated",
  [RESERVATION_STATUSES.COMPLETED]: "closed",
  [RESERVATION_STATUSES.CANCELLED]: "closed",
  [RESERVATION_STATUSES.CANCELLED_BY_GUEST]: "closed",
  [RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT]: "closed",
  [RESERVATION_STATUSES.REJECTED]: "closed",
  [RESERVATION_STATUSES.NO_SHOW]: "closed",
  [RESERVATION_STATUSES.PAYMENT_EXPIRED]: "closed",
};

export function getBookingPhase(status: string): BookingPhase {
  return PHASE_BY_STATUS[status] ?? "needs_confirmation";
}

export function isClosedBooking(status: string): boolean {
  return getBookingPhase(status) === "closed";
}
export function isActiveBooking(status: string): boolean {
  return !isClosedBooking(status);
}
export function isNeedsConfirmationBooking(status: string): boolean {
  return getBookingPhase(status) === "needs_confirmation";
}

/** Every status that is a terminal/closed state — for DB `where` clauses. */
export const CLOSED_STATUSES: string[] = Object.entries(PHASE_BY_STATUS)
  .filter(([, phase]) => phase === "closed")
  .map(([status]) => status);

/** Every non-closed status — for excluding closed bookings from the live queue. */
export const ACTIVE_STATUSES: string[] = Object.values(RESERVATION_STATUSES).filter((status) => !isClosedBooking(status));

// --- Phase labels / tone (lifecycle indicator above the guest name) ---

const PHASE_LABELS: Record<BookingPhase, string> = {
  needs_confirmation: "Нужно подтвердить",
  awaiting_payment: "Ждёт оплату",
  confirmed: "Подтверждена",
  seated: "Гость посажен",
  closed: "Закрыта",
};
/** "attention" = needs the manager; "ok" = on track; "muted" = closed. */
const PHASE_TONES: Record<BookingPhase, "attention" | "ok" | "muted"> = {
  needs_confirmation: "attention",
  awaiting_payment: "attention",
  confirmed: "ok",
  seated: "ok",
  closed: "muted",
};

export function getBookingPhaseLabel(status: string): string {
  return PHASE_LABELS[getBookingPhase(status)];
}
export function getBookingPhaseTone(status: string): "attention" | "ok" | "muted" {
  return PHASE_TONES[getBookingPhase(status)];
}

// --- Closure type (for the history filter) ---

export type ClosureType = "completed" | "cancelled" | "rejected" | "no_show";

/** Statuses that make up each closure bucket shown in «История броней». */
export const CLOSURE_TYPE_STATUSES: Record<ClosureType, string[]> = {
  completed: [RESERVATION_STATUSES.COMPLETED],
  cancelled: [
    RESERVATION_STATUSES.CANCELLED,
    RESERVATION_STATUSES.CANCELLED_BY_GUEST,
    RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
    RESERVATION_STATUSES.PAYMENT_EXPIRED,
  ],
  rejected: [RESERVATION_STATUSES.REJECTED],
  no_show: [RESERVATION_STATUSES.NO_SHOW],
};

export function getClosureType(status: string): ClosureType | null {
  for (const [type, statuses] of Object.entries(CLOSURE_TYPE_STATUSES) as [ClosureType, string[]][]) {
    if (statuses.includes(status)) return type;
  }
  return null;
}

// --- Live-queue tabs (lifecycle only; payment/risk are NOT tabs) ---

export type BookingTabKey = "needs_confirmation" | "awaiting_payment" | "active" | "all_active";

/** Tabs for the «Брони» screen. Each maps to a set of phases. None include closed. */
export const BOOKING_TABS: { key: BookingTabKey; label: string; phases: BookingPhase[]; title: string; subtitle: string; emptyTitle: string; emptyHint: string }[] = [
  {
    key: "needs_confirmation",
    label: "Нужно подтвердить",
    phases: ["needs_confirmation"],
    title: "Заявки на подтверждение",
    subtitle: "Показываем только новые заявки, где требуется решение менеджера.",
    emptyTitle: "Нет заявок на подтверждение",
    emptyHint: "Когда гости создадут новую бронь, она появится здесь.",
  },
  {
    key: "awaiting_payment",
    label: "Ждут оплату",
    phases: ["awaiting_payment"],
    title: "Брони, ждущие оплату",
    subtitle: "Заявки одобрены, но для подтверждения нужен депозит.",
    emptyTitle: "Нет броней, ждущих оплату",
    emptyHint: "Здесь появятся брони, для которых нужен депозит.",
  },
  {
    key: "active",
    label: "Активные",
    phases: ["confirmed", "seated"],
    title: "Активные брони",
    subtitle: "Подтверждённые брони и гости, которые уже за столом.",
    emptyTitle: "Активных броней нет",
    emptyHint: "Подтверждённые брони появятся здесь.",
  },
  {
    key: "all_active",
    label: "Все активные",
    phases: ["needs_confirmation", "awaiting_payment", "confirmed", "seated"],
    title: "Все активные брони",
    subtitle: "Все брони в работе: от новых заявок до посаженных гостей. Закрытые — в «Истории броней».",
    emptyTitle: "Активных броней нет",
    emptyHint: "Новые заявки и подтверждённые брони появятся здесь.",
  },
];

export function getBookingTab(key: string | undefined) {
  return BOOKING_TABS.find((tab) => tab.key === key) ?? BOOKING_TABS[0];
}

// --- Available manager actions per phase ---

export type BookingActionKey = "confirm" | "reject" | "mark_paid" | "request_confirmation" | "seated" | "cancel" | "no_show" | "complete";

/** Static action metadata. `kind` tells the client which handler to call. */
export const BOOKING_ACTIONS: Record<BookingActionKey, { endpoint: string; label: string; kind: "status" | "mark_paid" | "request_confirmation"; tone?: "danger" | "success" }> = {
  confirm: { endpoint: "confirm", label: "Подтвердить", kind: "status", tone: "success" },
  reject: { endpoint: "reject", label: "Отклонить", kind: "status", tone: "danger" },
  mark_paid: { endpoint: "mark-payment-paid", label: "Отметить оплату", kind: "mark_paid", tone: "success" },
  request_confirmation: { endpoint: "request-confirmation", label: "Ссылка гостю", kind: "request_confirmation" },
  seated: { endpoint: "seated", label: "Посадить", kind: "status", tone: "success" },
  cancel: { endpoint: "cancel", label: "Отменить", kind: "status", tone: "danger" },
  no_show: { endpoint: "no-show", label: "Гость не пришёл", kind: "status", tone: "danger" },
  complete: { endpoint: "complete", label: "Завершить визит", kind: "status", tone: "success" },
};

type ActionInput = {
  status: string;
  paymentRequired?: boolean | null;
  paymentStatus?: string | null;
  /** Whether the visit start time has already arrived (gates «Гость не пришёл»). */
  visitStarted?: boolean;
};

/**
 * Which lifecycle actions a manager may take, in display order. Closed bookings
 * return an empty list — they are terminal and read-only.
 */
export function getAvailableActions(booking: ActionInput): BookingActionKey[] {
  const phase = getBookingPhase(booking.status);
  if (phase === "closed") return [];

  const awaitingPayment = Boolean(booking.paymentRequired) && booking.paymentStatus === EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT;
  const keys: BookingActionKey[] = [];

  if (phase === "needs_confirmation") {
    keys.push("confirm", "reject", "request_confirmation");
  } else if (phase === "awaiting_payment") {
    if (awaitingPayment) keys.push("mark_paid");
    keys.push("cancel");
  } else if (phase === "confirmed") {
    // deposit_paid is paid but not yet formally confirmed — let the manager confirm it.
    if (booking.status === RESERVATION_STATUSES.DEPOSIT_PAID) keys.push("confirm");
    if (awaitingPayment) keys.push("mark_paid");
    keys.push("seated", "request_confirmation", "cancel");
    if (booking.visitStarted) keys.push("no_show");
  } else if (phase === "seated") {
    keys.push("complete");
  }

  return keys;
}

/** Guard for the state machine: terminal statuses accept no further transitions. */
export function canTransitionFrom(currentStatus: string): boolean {
  return !isClosedBooking(currentStatus);
}
