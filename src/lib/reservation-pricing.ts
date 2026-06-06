import { BookingPricingRule, RestaurantTable, TableType } from "@prisma/client";
import { NO_SHOW_RISK_LEVELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { dateFromInput, timeToMinutes } from "@/lib/time";

export type ReservationPriceInput = {
  restaurantId: string;
  tableId?: string | null;
  tableTypeId?: string | null;
  guestsCount: number;
  reservationDate: string;
  startTime: string;
  endTime?: string | null;
  guestId?: string | null;
  phone?: string | null;
};

export type ReservationPriceResult = {
  bookingPrice: number;
  depositAmount: number;
  isDepositRequired: boolean;
  appliedRuleId: string | null;
  explanation: string;
  noShowRiskLevel: string;
  noShowRiskScore: number;
};

type TableWithType = RestaurantTable & { tableType: TableType | null };

function dayOfWeek(date: Date) {
  return date.getDay();
}

function ruleMatches(rule: BookingPricingRule, input: ReservationPriceInput, date: Date, table: TableWithType | null) {
  if (rule.tableId && rule.tableId !== input.tableId) return false;
  const tableTypeId = input.tableTypeId || table?.tableTypeId || null;
  if (rule.tableTypeId && rule.tableTypeId !== tableTypeId) return false;
  if (rule.minGuests && input.guestsCount < rule.minGuests) return false;
  if (rule.maxGuests && input.guestsCount > rule.maxGuests) return false;
  if (rule.dayOfWeek !== null && rule.dayOfWeek !== dayOfWeek(date)) return false;
  if (rule.startTime && timeToMinutes(input.startTime) < timeToMinutes(rule.startTime)) return false;
  if (rule.endTime && timeToMinutes(input.startTime) >= timeToMinutes(rule.endTime)) return false;
  return true;
}

async function getGuestRisk(input: ReservationPriceInput) {
  if (input.guestId) {
    const guest = await prisma.guest.findUnique({ where: { id: input.guestId }, select: { riskLevel: true, noShowCount: true, reservationsCount: true } });
    if (guest) return guest;
  }
  if (input.phone) {
    const phone = normalizePhone(input.phone);
    const guest = await prisma.guest.findUnique({ where: { restaurantId_phone: { restaurantId: input.restaurantId, phone } }, select: { riskLevel: true, noShowCount: true, reservationsCount: true } });
    if (guest) return guest;
  }
  return null;
}

export async function calculateReservationPrice(input: ReservationPriceInput): Promise<ReservationPriceResult> {
  const date = dateFromInput(input.reservationDate);
  const [table, rules, depositSettings, guestRisk] = await Promise.all([
    input.tableId
      ? prisma.restaurantTable.findFirst({ where: { id: input.tableId, restaurantId: input.restaurantId }, include: { tableType: true } })
      : null,
    prisma.bookingPricingRule.findMany({ where: { restaurantId: input.restaurantId, isActive: true }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }] }),
    prisma.reservationDepositSettings.findUnique({ where: { restaurantId: input.restaurantId } }),
    getGuestRisk(input),
  ]);

  const tableType = table?.tableType ?? (input.tableTypeId ? await prisma.tableType.findFirst({ where: { id: input.tableTypeId, restaurantId: input.restaurantId } }) : null);
  const appliedRule = rules.find((rule) => ruleMatches(rule, input, date, table));
  const depositsEnabled = Boolean(depositSettings?.depositEnabled && depositSettings.isActive);
  let bookingPrice = 0;
  let depositAmount = 0;
  let isDepositRequired = false;
  let explanation = "Для этого стола депозит не нужен. Если ресторан попросит подтвердить визит, ссылка придёт отдельно.";
  let appliedRuleId: string | null = null;

  if (appliedRule) {
    bookingPrice = appliedRule.bookingPrice;
    depositAmount = appliedRule.depositAmount;
    isDepositRequired = depositsEnabled && appliedRule.isDepositRequired && appliedRule.depositAmount > 0;
    appliedRuleId = appliedRule.id;
    explanation = isDepositRequired
      ? `${appliedRule.title}: ресторан просит депозит ${depositAmount} ₽. Он будет учтён в счёте или обработан по правилам ресторана.`
      : `${appliedRule.title}: депозит не нужен.`;
  } else if (table) {
    bookingPrice = table.bookingPrice ?? tableType?.defaultBookingPrice ?? 0;
    depositAmount = table.depositAmount ?? tableType?.defaultDepositAmount ?? 0;
    isDepositRequired = depositsEnabled && Boolean(table.depositRequired ?? tableType?.isDepositRequired) && depositAmount > 0;
    explanation = isDepositRequired
      ? `Для стола ${table.number}${tableType ? ` (${tableType.title})` : ""} ресторан просит депозит ${depositAmount} ₽. Это помогает сохранить стол и снизить риск пустых посадок.`
      : `Для стола ${table.number} депозит не нужен. Если ресторан попросит подтвердить визит, ссылка придёт отдельно.`;
  } else if (tableType) {
    bookingPrice = tableType.defaultBookingPrice;
    depositAmount = tableType.defaultDepositAmount;
    isDepositRequired = depositsEnabled && tableType.isDepositRequired && depositAmount > 0;
    explanation = isDepositRequired
      ? `Для типа стола «${tableType.title}» нужен депозит ${depositAmount} ₽. Условия возврата указаны рестораном.`
      : `Для типа стола «${tableType.title}» депозит не нужен.`;
  }

  if (!appliedRule && depositsEnabled && depositSettings) {
    const peakHour = [5, 6].includes(dayOfWeek(date)) && timeToMinutes(input.startTime) >= timeToMinutes("18:00") && timeToMinutes(input.startTime) < timeToMinutes("23:00");
    const highRisk = guestRisk?.riskLevel === NO_SHOW_RISK_LEVELS.HIGH || (guestRisk?.noShowCount ?? 0) > 0;
    const largeTable = tableType?.code === "large" || (table?.maxGuests ?? table?.seats ?? tableType?.maxGuests ?? 0) >= 6;
    if (!isDepositRequired && depositSettings.requireDepositForLargeTables && largeTable) {
      depositAmount = table?.depositAmount ?? tableType?.defaultDepositAmount ?? depositSettings.defaultDepositAmount;
      isDepositRequired = depositAmount > 0;
      explanation = `Для большого стола ресторан просит депозит ${depositAmount} ₽. Это помогает сохранить стол и снизить риск пустых посадок.`;
    }
    if (!isDepositRequired && depositSettings.requireDepositForGuestsFrom && input.guestsCount >= depositSettings.requireDepositForGuestsFrom) {
      depositAmount = depositSettings.defaultDepositAmount;
      isDepositRequired = depositAmount > 0;
      explanation = `Для компании от ${depositSettings.requireDepositForGuestsFrom} человек ресторан просит депозит ${depositAmount} ₽.`;
    }
    if (!isDepositRequired && depositSettings.requireDepositForPeakHours && peakHour) {
      depositAmount = depositSettings.defaultDepositAmount;
      isDepositRequired = depositAmount > 0;
      explanation = `В пятницу и субботу вечером ресторан просит депозит ${depositAmount} ₽ для подтверждения визита.`;
    }
    if (!isDepositRequired && depositSettings.requireDepositForHighRiskGuests && highRisk) {
      depositAmount = depositSettings.defaultDepositAmount;
      isDepositRequired = depositAmount > 0;
      explanation = `Для этого визита ресторан просит депозит ${depositAmount} ₽.`;
    }
  }

  const risk = calculateNoShowRisk({ input, depositRequired: isDepositRequired, depositAmount, guestRisk });
  if (!depositsEnabled) {
    isDepositRequired = false;
    depositAmount = 0;
    if (bookingPrice === 0) explanation = "Депозит в этом ресторане сейчас отключён. Стол можно выбрать без предоплаты.";
  }

  return {
    bookingPrice,
    depositAmount: isDepositRequired ? depositAmount : 0,
    isDepositRequired,
    appliedRuleId,
    explanation,
    noShowRiskLevel: risk.level,
    noShowRiskScore: risk.score,
  };
}

function calculateNoShowRisk(input: { input: ReservationPriceInput; depositRequired: boolean; depositAmount: number; guestRisk: { riskLevel: string; noShowCount: number; reservationsCount: number } | null }) {
  let score = 10;
  if (input.depositRequired && input.depositAmount > 0) score -= 5;
  if (input.input.guestsCount >= 6) score += 25;
  if ((input.guestRisk?.noShowCount ?? 0) > 0 || input.guestRisk?.riskLevel === NO_SHOW_RISK_LEVELS.HIGH) score += 55;
  if (input.guestRisk && input.guestRisk.reservationsCount > 2 && input.guestRisk.noShowCount === 0) score -= 10;
  score = Math.max(0, Math.min(100, score));
  return { score, level: score >= 70 ? NO_SHOW_RISK_LEVELS.HIGH : score >= 35 ? NO_SHOW_RISK_LEVELS.MEDIUM : NO_SHOW_RISK_LEVELS.LOW };
}
