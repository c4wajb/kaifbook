import { DAY_LABELS } from "@/lib/constants";
import { parseStringList } from "@/lib/json-fields";
import { dateInputValue, formatDateRu } from "@/lib/time";

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}

export function formatList(value: unknown): string {
  return parseStringList(value).join(", ");
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
    awaiting_restaurant_confirmation: "Ждет ресторан",
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
    no_show: "Гость не пришел",
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
