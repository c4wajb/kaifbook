import { EXTERNAL_PAYMENT_STATUS_LABELS } from "@/lib/constants";

export const DEFAULT_EXTERNAL_PAYMENT_TERMS =
  "Для подтверждения брони нужно внести депозит. Оплата проходит напрямую ресторану. Депозит будет зачтен в счет заказа. Чек, подтверждение оплаты и возврат оформляет ресторан.";

export const DEFAULT_DEPOSIT_REFUND_POLICY =
  "Депозит возвращается полностью, если гость отменяет бронь не позднее чем за 24 часа до визита. При отмене менее чем за 24 часа или неявке депозит не возвращается. Возврат оформляет ресторан тем же способом оплаты в течение 3–5 рабочих дней.";

export const EXTERNAL_PAYMENT_DISCLAIMER =
  "Оплата проходит напрямую ресторану. Kaifbook не принимает оплату за бронь и не является продавцом услуги. Чек, подтверждение оплаты и возврат оформляет ресторан.";

export function isSafeExternalPaymentUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function externalPaymentStatusLabel(status?: string | null) {
  if (!status) return EXTERNAL_PAYMENT_STATUS_LABELS.not_required;
  return EXTERNAL_PAYMENT_STATUS_LABELS[status] ?? status;
}

export function hasExternalDepositEnabled(restaurant: {
  isPaymentEnabled: boolean;
  paymentMode: string;
  externalDepositAmount: number;
  externalPaymentUrl?: string | null;
}) {
  return restaurant.isPaymentEnabled && restaurant.paymentMode === "external_deposit" && restaurant.externalDepositAmount > 0 && isSafeExternalPaymentUrl(restaurant.externalPaymentUrl);
}

export function applyExternalDepositToPricing<T extends { depositAmount: number; isDepositRequired: boolean; explanation: string }>(
  pricing: T,
  restaurant: { isPaymentEnabled: boolean; paymentMode: string; externalDepositAmount: number; externalPaymentUrl?: string | null },
) {
  if (pricing.isDepositRequired && hasExternalDepositEnabled(restaurant)) {
    const depositAmount = pricing.depositAmount > 0 ? pricing.depositAmount : restaurant.externalDepositAmount;
    return {
      ...pricing,
      depositAmount,
      isDepositRequired: true,
      explanation: `${pricing.explanation || `Для подтверждения брони нужен депозит ${depositAmount} ₽.`} Оплата пройдет напрямую ресторану.`,
    };
  }

  return {
    ...pricing,
    depositAmount: 0,
    isDepositRequired: false,
    explanation: "Оплата при бронировании не требуется.",
  };
}
