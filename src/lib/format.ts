import { DAY_LABELS } from "@/lib/constants";
import { parseStringList } from "@/lib/json-fields";
import { dateInputValue, formatDateRu } from "@/lib/time";

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}

export function formatList(value: unknown): string {
  return parseStringList(value).join(", ");
}

/**
 * Russian plural selection. forms = [one, few, many]:
 * 1 → one (гость), 2–4 → few (гостя), 0/5–20 → many (гостей), with the usual
 * teen exceptions (11–14 → many).
 */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

/** "2 гостя", "5 гостей", "1 гость". */
export function formatGuests(count: number): string {
  return `${count} ${pluralizeRu(count, ["гость", "гостя", "гостей"])}`;
}

/** "1 оценка", "2 оценки", "5 оценок". */
export function formatReviews(count: number): string {
  return `${count} ${pluralizeRu(count, ["оценка", "оценки", "оценок"])}`;
}

export function reservationDateLabel(value: Date): string {
  return formatDateRu(value);
}

export function reservationDateInput(value: Date): string {
  return dateInputValue(value);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatDateRu(new Date(value));
}

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? "День";
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "На модерации",
    approved: "Опубликован",
    rejected: "Отклонена",
    new: "Новая",
    awaiting_restaurant_confirmation: "Ждёт ресторан",
    confirmed_by_restaurant: "Подтверждена рестораном",
    awaiting_deposit_payment: "Ожидает оплаты ресторану",
    deposit_paid: "Оплачена ресторану",
    confirmed_by_guest: "Подтверждена гостем",
    confirmed: "Подтверждена",
    seated: "Гости пришли",
    cancelled_by_guest: "Отменена гостем",
    cancelled_by_restaurant: "Отменена рестораном",
    payment_expired: "Оплата истекла",
    cancelled: "Отменена",
    completed: "Завершена",
    no_show: "Гость не пришёл",
    waiting_for_payment: "Ожидает оплату",
    paid: "Оплачено",
    not_required: "Оплата не требуется",
    awaiting_external_payment: "Ожидает оплаты ресторану",
    paid_to_restaurant: "Оплачена ресторану",
    failed: "Ошибка оплаты",
    refunded: "Возвращено",
    expired: "Оплата истекла",
  };
  return labels[status] ?? status;
}
