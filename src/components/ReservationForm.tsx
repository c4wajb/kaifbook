"use client";

import { Armchair, ArrowRight, CalendarDays, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, KeyRound, Loader2, MessageCircle, Send, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrettySelect } from "@/components/PrettySelect";
import { PublicBookingTable, PublicHallBookingWidget } from "@/components/PublicHallBookingWidget";
import { ReservationQrCard } from "@/components/ReservationQrCard";
import { fetchJsonWithDiagnostics, isFriendlyAbort } from "@/lib/client-fetch";
import { formatRuPhoneInput, isValidRuPhone, normalizePhone } from "@/lib/phone";
import { generateEndTimeSlots, generateStartTimeSlots, isRangeWithinWorkingHours, localDateInputValue, workingHourForDate, type WorkingHourLike } from "@/lib/time";
import { getStoredVkMiniToken } from "@/services/vkBridgeService";

type TableType = { id: string; title: string; code: string; minGuests: number; maxGuests: number; defaultDepositAmount: number; isDepositRequired: boolean };
type Hall = {
  id: string;
  title: string;
  width: number;
  height: number;
  tables: Array<{
    id: string;
    number: string;
    seats: number;
    isActive: boolean;
    tableTypeId?: string | null;
    bookingPrice?: number | null;
    depositAmount?: number | null;
    depositRequired?: boolean | null;
    minGuests?: number | null;
    maxGuests?: number | null;
    hallId?: string;
    tableType?: TableType | null;
  }>;
};
type Pricing = { bookingPrice: number; depositAmount: number; isDepositRequired: boolean; appliedRuleId?: string | null; explanation: string; noShowRiskLevel: string };
type SuccessSummary = {
  restaurantTitle: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
  customerName: string;
  customerPhone: string;
  tableNumber?: string | null;
  seatsCount: number;
  paymentUrl?: string | null;
  paymentTermsText?: string | null;
  paymentDisclaimer?: string | null;
  confirmationUrl?: string | null;
  qrUrl?: string | null;
  normalizedPhone: string;
  depositAmount: number;
  isDepositRequired: boolean;
};
type VerificationProvider = "max" | "vk";
type VerificationStatus = "idle" | "pending" | "confirmed" | "expired" | "failed";
type VerificationState = {
  provider: VerificationProvider | null;
  status: VerificationStatus;
  sessionId?: string | null;
  confirmUrl?: string | null;
  appUrl?: string | null;
  commandText?: string | null;
  publicCode?: string | null;
  expiresAt?: string | null;
  message?: string | null;
};
type VkIdStartResponse = { appId: number; redirectUrl: string; state: string; codeChallenge: string; scope: string; expiresAt: string };

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const safe = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function addMinutes(value: string, minutes: number) {
  return minutesToTime(timeToMinutes(value) + minutes);
}

function fallbackTimeOptions() {
  return Array.from({ length: 24 * 4 }, (_, index) => minutesToTime(index * 15));
}

function fallbackEndOptions(startTime: string) {
  if (!startTime) return [];
  const start = timeToMinutes(startTime);
  return fallbackTimeOptions().filter((slot) => timeToMinutes(slot) >= start + 60);
}

function addDaysToTodayInput(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return localDateInputValue(value);
}

function formatDateInputRu(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

const DATE_WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function dateFromInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateInputFromDate(value: Date) {
  return localDateInputValue(value);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, months: number) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function sameMonth(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function monthTitle(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(value);
}

function calendarDays(visibleMonth: Date) {
  const firstDay = startOfMonth(visibleMonth);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function TimeSlotPicker({
  name,
  label,
  value,
  slots,
  disabled,
  emptyMessage,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  slots: string[];
  disabled?: boolean;
  emptyMessage: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <label className="time-picker-field" ref={rootRef}>
      <span>{label}</span>
      <input name={name} value={value} readOnly hidden required />
      <button className="time-picker-trigger" type="button" disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <strong>{value || "Выберите время"}</strong>
        <span aria-hidden>⌄</span>
      </button>
      {open ? (
        <div className="time-slot-popover">
          {slots.length ? (
            <div className="time-slot-grid">
              {slots.map((slot) => (
                <button
                  className={`time-slot-option ${slot === value ? "selected" : ""}`}
                  key={slot}
                  type="button"
                  onClick={() => {
                    onChange(slot);
                    setOpen(false);
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="time-slot-empty">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </label>
  );
}

function DatePickerField({
  name,
  label,
  value,
  min,
  max,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(dateFromInputValue(value)));
  const rootRef = useRef<HTMLLabelElement>(null);
  const selectedDate = useMemo(() => dateFromInputValue(value), [value]);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    setVisibleMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const previousDisabled = dateInputFromDate(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)) < min;
  const nextDisabled = dateInputFromDate(nextMonth) > max;

  return (
    <label className="date-picker-field" ref={rootRef}>
      <span>{label}</span>
      <input name={name} value={value} readOnly hidden required />
      <button className="date-picker-trigger" type="button" onClick={() => setOpen((current) => !current)}>
        <strong>{formatDateInputRu(value)}</strong>
        <CalendarDays size={18} aria-hidden />
      </button>
      {open ? (
        <div className="date-picker-popover">
          <div className="date-picker-header">
            <button type="button" disabled={previousDisabled} aria-label="Предыдущий месяц" onClick={() => setVisibleMonth(previousMonth)}>
              ‹
            </button>
            <strong>{monthTitle(visibleMonth)}</strong>
            <button type="button" disabled={nextDisabled} aria-label="Следующий месяц" onClick={() => setVisibleMonth(nextMonth)}>
              ›
            </button>
          </div>
          <div className="date-picker-weekdays" aria-hidden>
            {DATE_WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {days.map((day) => {
              const inputValue = dateInputFromDate(day);
              const isCurrentMonth = sameMonth(day, visibleMonth);
              const disabled = !isCurrentMonth || inputValue < min || inputValue > max;
              const selected = inputValue === value;
              return (
                <button
                  className={`${selected ? "selected" : ""} ${isCurrentMonth ? "" : "muted"}`}
                  disabled={disabled}
                  key={inputValue}
                  type="button"
                  onClick={() => {
                    onChange(inputValue);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            <button
              type="button"
              onClick={() => {
                onChange(localDateInputValue());
                setOpen(false);
              }}
            >
              Сегодня
            </button>
          </div>
        </div>
      ) : null}
    </label>
  );
}

export function ReservationForm({
  restaurantId,
  restaurantSlug,
  restaurantTitle = "Ресторан",
  halls,
  workingHours = [],
  bookingIntervalMinutes = 15,
  minAdvanceBookingMinutes = 30,
  maxAdvanceBookingDays = 30,
  reservationDurationMinutes = 120,
  source = "web",
  myReservationsHref,
  initialCustomerName,
  initialCustomerPhone,
  authenticatedGuest = false,
  requirePhoneConfirmation = false,
}: {
  restaurantId: string;
  restaurantSlug?: string;
  restaurantTitle?: string;
  halls: Hall[];
  workingHours?: WorkingHourLike[];
  bookingIntervalMinutes?: number;
  minAdvanceBookingMinutes?: number;
  maxAdvanceBookingDays?: number;
  reservationDurationMinutes?: number;
  source?: "web" | "vk-mini-app";
  myReservationsHref?: string;
  initialCustomerName?: string | null;
  initialCustomerPhone?: string | null;
  authenticatedGuest?: boolean;
  requirePhoneConfirmation?: boolean;
}) {
  const initialFormattedPhone = initialCustomerPhone ? formatRuPhoneInput(initialCustomerPhone) : "";
  const [verifiedInSession, setVerifiedInSession] = useState(false);
  const isAuthenticatedGuest = Boolean(authenticatedGuest && initialFormattedPhone) || verifiedInSession;
  // When the restaurant requires phone confirmation, a web guest must verify via
  // MAX/VK before submitting. Already-verified guests and VK Mini App (identity
  // bound) are exempt. The server enforces the same rule as a backstop.
  const mustConfirmPhone = requirePhoneConfirmation && source !== "vk-mini-app" && !isAuthenticatedGuest;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const [reservationDate, setReservationDate] = useState(localDateInputValue());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestsCount, setGuestsCount] = useState(2);
  const [customerName, setCustomerName] = useState(initialCustomerName?.trim() || "");
  const [customerPhone, setCustomerPhone] = useState(initialFormattedPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationState>({ provider: null, status: "idle" });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [vkIdPending, setVkIdPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tableId, setTableId] = useState("");
  const [selectedTable, setSelectedTable] = useState<PublicBookingTable | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pricingPending, setPricingPending] = useState(false);
  const [seatSelectionEnabled, setSeatSelectionEnabled] = useState(true);
  const [successSummary, setSuccessSummary] = useState<SuccessSummary | null>(null);

  const hasWorkingHours = workingHours.length > 0;
  const tables = useMemo(() => halls.flatMap((hall) => hall.tables.map((table) => ({ ...table, hallTitle: hall.title, hallId: hall.id }))), [halls]);
  const hasConfiguredHall = halls.some((hall) => hall.tables.length > 0);
  const restaurantKey = restaurantSlug || restaurantId;
  const selectedTableCapacity = selectedTable ? selectedTable.maxGuests || selectedTable.seats : null;
  const normalizedGuestsCount = Math.max(1, Number.isFinite(guestsCount) ? Math.trunc(guestsCount) : 1);
  const stepMinutes = bookingIntervalMinutes || 15;
  const minBookingDurationMinutes = Math.max(60, reservationDurationMinutes || 120);
  const maxAdvanceDays = Math.max(1, Number.isFinite(maxAdvanceBookingDays) ? Math.trunc(maxAdvanceBookingDays) : 30);
  const maxReservationDate = useMemo(() => addDaysToTodayInput(maxAdvanceDays), [maxAdvanceDays]);
  const isReservationDateTooFar = reservationDate > maxReservationDate;
  const activeWorkingHour = useMemo(() => workingHourForDate(reservationDate, workingHours), [reservationDate, workingHours]);
  const startTimeOptions = useMemo(
    () => {
      if (isReservationDateTooFar) return [];
      return hasWorkingHours
        ? generateStartTimeSlots({ date: reservationDate, workingHours, stepMinutes, minBookingDurationMinutes, preparationBufferMinutes: minAdvanceBookingMinutes })
        : fallbackTimeOptions();
    },
    [hasWorkingHours, isReservationDateTooFar, minAdvanceBookingMinutes, minBookingDurationMinutes, reservationDate, stepMinutes, workingHours],
  );
  const endTimeOptions = useMemo(
    () => (hasWorkingHours ? generateEndTimeSlots({ date: reservationDate, workingHours, selectedStartTime: startTime, stepMinutes, minBookingDurationMinutes: 60 }) : fallbackEndOptions(startTime)),
    [hasWorkingHours, reservationDate, startTime, stepMinutes, workingHours],
  );
  const timeError = isReservationDateTooFar
    ? `Этот ресторан принимает брони максимум на ${maxAdvanceDays} дней вперед. Выберите дату не позже ${formatDateInputRu(maxReservationDate)}.`
    : hasWorkingHours && (!activeWorkingHour || activeWorkingHour.isClosed)
    ? "Ресторан не работает в выбранный день."
    : hasWorkingHours && !startTimeOptions.length
      ? "На выбранную дату нет доступного времени для бронирования."
      : !startTime || !endTime
        ? "Выберите время бронирования."
        : hasWorkingHours && !isRangeWithinWorkingHours(startTime, endTime, activeWorkingHour)
          ? "Выбранное время недоступно. Выберите время в рамках работы ресторана."
          : timeToMinutes(startTime) === timeToMinutes(endTime)
            ? "Время окончания должно быть позже времени начала."
            : null;

  const resetVisualSelection = useCallback((reason: string) => {
    if (process.env.NODE_ENV !== "production") console.info("[Kaifbook:selection] reset", { reason });
    setTableId("");
    setSelectedTable(null);
    setSelectedSeatIds([]);
    setPricing(null);
  }, []);

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!startTimeOptions.length) {
      setStartTime("");
      setEndTime("");
      if (hasWorkingHours && !mountedRef.current) {
        mountedRef.current = true;
        const max = maxReservationDate;
        let candidate = reservationDate;
        for (let attempt = 0; attempt < 14; attempt++) {
          const next = new Date(dateFromInputValue(candidate));
          next.setDate(next.getDate() + 1);
          candidate = dateInputFromDate(next);
          if (candidate > max) break;
          const slots = generateStartTimeSlots({ date: candidate, workingHours, stepMinutes, minBookingDurationMinutes, preparationBufferMinutes: minAdvanceBookingMinutes });
          if (slots.length) {
            setReservationDate(candidate);
            break;
          }
        }
      }
      return;
    }
    mountedRef.current = true;
    if (!startTime || !startTimeOptions.includes(startTime)) setStartTime(startTimeOptions[0]);
  }, [startTime, startTimeOptions, hasWorkingHours, maxReservationDate, reservationDate, workingHours, stepMinutes, minBookingDurationMinutes, minAdvanceBookingMinutes]);

  useEffect(() => {
    if (!startTime) {
      setEndTime("");
      return;
    }
    if (!endTimeOptions.length) {
      setEndTime("");
      return;
    }
    if (!endTime || !endTimeOptions.includes(endTime)) {
      const preferredEnd = addMinutes(startTime, reservationDurationMinutes || 120);
      setEndTime(endTimeOptions.includes(preferredEnd) ? preferredEnd : endTimeOptions[0]);
    }
  }, [endTime, endTimeOptions, reservationDurationMinutes, startTime]);

  useEffect(() => {
    resetVisualSelection("date_or_time_changed");
  }, [endTime, reservationDate, resetVisualSelection, startTime]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBasePricing() {
      if (!reservationDate || !startTime || !endTime || guestsCount < 1 || tableId || timeError) return;
      setPricingPending(true);
      try {
        const data = await fetchJsonWithDiagnostics<{ pricing: Pricing }>(`/api/public/restaurants/${restaurantKey}/calculate-reservation-price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, tableId: null, guestsCount, reservationDate, startTime, endTime }),
          signal: controller.signal,
          debugLabel: "base-pricing",
          userMessage: "Не удалось обновить условия бронирования. Проверьте интернет и попробуйте еще раз.",
          logPayload: { restaurantKey, restaurantId, tableId: null, guestsCount, reservationDate, startTime, endTime },
        });
        setPricing(data.pricing);
      } catch (loadError) {
        if (!isFriendlyAbort(loadError)) setPricing(null);
      } finally {
        if (!controller.signal.aborted) setPricingPending(false);
      }
    }
    loadBasePricing();
    return () => controller.abort();
  }, [endTime, guestsCount, reservationDate, restaurantId, restaurantKey, startTime, tableId, timeError]);

  useEffect(() => {
    if (verification.status !== "pending" || !verification.sessionId) return;
    const controller = new AbortController();
    const interval = window.setInterval(async () => {
      try {
        const data = await fetchJsonWithDiagnostics<{
          status: "pending" | "confirmed" | "expired" | "cancelled" | "failed";
          provider: VerificationProvider;
          providerLabel: string;
          confirmedAt?: string | null;
        }>(`/api/verifications/${verification.sessionId}/status`, {
          signal: controller.signal,
          debugLabel: "verification-status",
          userMessage: "Не удалось обновить статус подтверждения. Попробуйте позже.",
        });
        if (data.status === "confirmed") {
          setVerification((current) => ({
            ...current,
            provider: data.provider,
            status: "confirmed",
            message: `Заявка подтверждена через ${data.providerLabel}. Теперь можно отправить бронирование.`,
          }));
          setVerifiedInSession(true);
        }
        if (data.status === "expired" || data.status === "cancelled" || data.status === "failed") {
          setVerification((current) => ({
            ...current,
            provider: data.provider,
            status: data.status === "expired" ? "expired" : "failed",
            message: data.status === "expired" ? "Время подтверждения истекло. Запустите подтверждение еще раз." : "Не удалось подтвердить заявку. Можно отправить бронирование без подтверждения.",
          }));
        }
      } catch (pollError) {
        if (!isFriendlyAbort(pollError)) {
          setVerification((current) => ({ ...current, status: "failed", message: "Не удалось проверить подтверждение. Можно отправить бронирование без него." }));
        }
      }
    }, 2500);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [verification.sessionId, verification.status]);

  // Restore a booking draft saved right before a VK ID redirect, so the guest
  // comes back to exactly the booking they were filling in. One-shot: the draft
  // is cleared as soon as it's read, so it never resurfaces on a fresh visit.
  useEffect(() => {
    try {
      const key = `kaifbook_booking_draft_${restaurantId}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      window.localStorage.removeItem(key);
      const draft = JSON.parse(raw) as Partial<{
        reservationDate: string; startTime: string; endTime: string; guestsCount: number;
        customerName: string; customerPhone: string; tableId: string; selectedSeatIds: string[]; selectedTable: PublicBookingTable | null;
      }>;
      if (draft.reservationDate) setReservationDate(draft.reservationDate);
      if (draft.startTime) setStartTime(draft.startTime);
      if (draft.endTime) setEndTime(draft.endTime);
      if (typeof draft.guestsCount === "number" && draft.guestsCount > 0) setGuestsCount(draft.guestsCount);
      if (draft.customerName) setCustomerName(draft.customerName);
      if (draft.customerPhone && !initialFormattedPhone) setCustomerPhone(formatRuPhoneInput(draft.customerPhone));
      if (Array.isArray(draft.selectedSeatIds)) setSelectedSeatIds(draft.selectedSeatIds);
      if (draft.tableId) setTableId(draft.tableId);
      if (draft.selectedTable) setSelectedTable(draft.selectedTable);
    } catch {
      // ignore a malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePricingChange = useCallback((nextPricing: Pricing | null) => setPricing(nextPricing), []);

  const handleSelectTable = useCallback((nextTableId: string, table: PublicBookingTable | null) => {
    setTableId(nextTableId);
    setSelectedTable(table);
    if (!nextTableId) setSelectedSeatIds([]);
  }, []);

  const handleGuestsInputChange = useCallback((value: string) => {
    const nextGuestsCount = Math.max(1, Number(value || 1));
    if (selectedTableCapacity && nextGuestsCount > selectedTableCapacity) {
      setGuestsCount(selectedTableCapacity);
      setSelectedSeatIds((current) => current.slice(0, selectedTableCapacity));
      setError(`Выбранный стол рассчитан максимум на ${selectedTableCapacity} гостей. Выберите другой стол или уменьшите количество гостей.`);
      return;
    }
    setError(null);
    setGuestsCount(nextGuestsCount);
    if (selectedTable) {
      setSelectedSeatIds((current) => current.slice(0, nextGuestsCount));
      return;
    }
    resetVisualSelection("guests_changed");
  }, [resetVisualSelection, selectedTable, selectedTableCapacity]);

  const handlePhoneChange = useCallback((value: string) => {
    setCustomerPhone(formatRuPhoneInput(value));
    if (phoneError) setPhoneError(null);
    if (verification.status !== "idle") setVerification({ provider: null, status: "idle" });
    setVerificationCode("");
  }, [phoneError, verification.status]);

  const handleNameChange = useCallback((value: string) => {
    setCustomerName(value);
    if (verification.status !== "idle" && verification.status !== "confirmed") setVerification({ provider: null, status: "idle" });
    if (verification.status !== "idle" && verification.status !== "confirmed") setVerificationCode("");
  }, [verification.status]);

  const saveBookingDraft = useCallback(() => {
    try {
      window.localStorage.setItem(
        `kaifbook_booking_draft_${restaurantId}`,
        JSON.stringify({ reservationDate, startTime, endTime, guestsCount, customerName, customerPhone, tableId, selectedSeatIds, selectedTable }),
      );
    } catch {
      // localStorage may be unavailable (private mode) — VK ID still works, just без восстановления черновика.
    }
  }, [customerName, customerPhone, endTime, guestsCount, reservationDate, restaurantId, selectedSeatIds, selectedTable, startTime, tableId]);

  // Same VK ID quick login as the standalone guest login form. The booking draft
  // is saved first so the OAuth redirect doesn't lose the in-progress booking.
  const startVkIdLogin = useCallback(async () => {
    setError(null);
    if (!isValidRuPhone(customerPhone)) {
      setPhoneError("Введите корректный номер телефона.");
      return;
    }
    setVkIdPending(true);
    try {
      const returnUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : undefined;
      saveBookingDraft();
      const data = await fetchJsonWithDiagnostics<VkIdStartResponse>("/api/guest-auth/vkid/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(customerPhone), returnUrl }),
        debugLabel: "booking-start-vkid",
        userMessage: "Не удалось начать вход через VK ID. Используйте MAX или VK-сообщество для подтверждения.",
      });
      const VKID = await import("@vkid/sdk");
      VKID.Config.init({
        app: data.appId,
        redirectUrl: data.redirectUrl,
        state: data.state,
        codeChallenge: data.codeChallenge,
        scope: data.scope,
        mode: VKID.ConfigAuthMode.Redirect,
      });
      await VKID.Auth.login({ lang: VKID.Languages.RUS });
    } catch (vkError) {
      setVkIdPending(false);
      setError(vkError instanceof Error ? vkError.message : "Не удалось открыть VK ID. Используйте подтверждение по коду.");
    }
  }, [customerPhone, saveBookingDraft]);

  const copyCommand = useCallback(async () => {
    if (!verification.commandText) return;
    try {
      await navigator.clipboard.writeText(verification.commandText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [verification.commandText]);

  const startMessengerVerification = useCallback(async (provider: VerificationProvider) => {
    setError(null);
    if (!isValidRuPhone(customerPhone)) {
      setPhoneError("Введите корректный номер телефона.");
      setVerification({ provider, status: "failed", message: "Сначала укажите корректный телефон." });
      return;
    }
    setVerificationPending(true);
    try {
      const data = await fetchJsonWithDiagnostics<{
        session: { id: string; provider: VerificationProvider; status: "pending"; expiresAt: string };
        confirmUrl: string;
        appUrl?: string | null;
        commandText: string;
        publicCode?: string | null;
      }>("/api/verifications/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, phone: normalizePhone(customerPhone), guestName: customerName, restaurantId }),
        debugLabel: "verification-start",
        userMessage: "Не удалось начать подтверждение. Можно отправить бронирование без него.",
        logPayload: { provider, restaurantId, phone: normalizePhone(customerPhone) },
      });
      setVerificationCode("");
      setCopied(false);
      // No auto-popup — the steps and the code field must stay visible. The guest
      // taps "Открыть" when ready; VK confirms code-free directly in the chat.
      setVerification({
        provider,
        status: "pending",
        sessionId: data.session.id,
        confirmUrl: data.confirmUrl,
        appUrl: data.appUrl || data.confirmUrl,
        commandText: data.commandText,
        publicCode: data.publicCode,
        expiresAt: data.session.expiresAt,
        message: null,
      });
    } catch (verifyError) {
      setVerification({
        provider,
        status: "failed",
        message: verifyError instanceof Error ? verifyError.message : "Не удалось начать подтверждение. Можно отправить бронирование без него.",
      });
    } finally {
      setVerificationPending(false);
    }
  }, [customerName, customerPhone, restaurantId]);

  const confirmMessengerVerification = useCallback(async () => {
    const cleanCode = verificationCode.replace(/\D/g, "");
    if (!verification.sessionId) {
      setError("Сначала выберите MAX или VK.");
      return;
    }
    if (cleanCode.length !== 6) {
      setError("Введите 6 цифр из сообщения.");
      return;
    }
    if (!isValidRuPhone(customerPhone)) {
      setPhoneError("Введите корректный номер телефона.");
      setError("Введите корректный номер телефона.");
      return;
    }

    setVerificationPending(true);
    setError(null);
    try {
      await fetchJsonWithDiagnostics("/api/guest/auth/verify-messenger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(customerPhone), verificationSessionId: verification.sessionId, code: cleanCode }),
        debugLabel: "verification-code-confirm",
        userMessage: "Не удалось проверить код. Попробуйте ещё раз.",
      });
      setVerification((current) => ({
        ...current,
        status: "confirmed",
        message: `Код принят через ${current.provider === "max" ? "MAX" : "VK"}. Теперь можно отправить заявку.`,
      }));
      setVerifiedInSession(true);
    } catch (verifyError) {
      setVerification((current) => ({
        ...current,
        status: "pending",
        message: verifyError instanceof Error ? verifyError.message : "Код не подошёл. Проверьте сообщение и попробуйте ещё раз.",
      }));
    } finally {
      setVerificationPending(false);
    }
  }, [customerPhone, verification.sessionId, verificationCode]);

  const handleStartTimeChange = useCallback((value: string) => {
    setStartTime(value);
    const nextEndSlots = hasWorkingHours
      ? generateEndTimeSlots({ date: reservationDate, workingHours, selectedStartTime: value, stepMinutes, minBookingDurationMinutes: 60 })
      : fallbackEndOptions(value);
    const preferredEnd = addMinutes(value, reservationDurationMinutes || 120);
    setEndTime(nextEndSlots.includes(preferredEnd) ? preferredEnd : nextEndSlots[0] || "");
    resetVisualSelection("start_time_changed");
  }, [hasWorkingHours, reservationDate, reservationDurationMinutes, resetVisualSelection, stepMinutes, workingHours]);

  const selectionError = useMemo(() => {
    if (!hasConfiguredHall) return null;
    if (!tableId || !selectedTable) return "Выберите свободный стол.";
    if (selectedTable.status !== "available") return "Этот стол уже недоступен. Выберите другой.";
    if (normalizedGuestsCount < selectedTable.minGuests) return `Этот стол подходит для компании от ${selectedTable.minGuests} гостей.`;
    if (normalizedGuestsCount > selectedTable.maxGuests) return `Выбранный стол рассчитан максимум на ${selectedTable.maxGuests} гостей. Выберите другой стол или уменьшите количество гостей.`;
    if (seatSelectionEnabled && selectedSeatIds.length < normalizedGuestsCount) return `Выберите ${normalizedGuestsCount} места рядом со столом.`;
    return null;
  }, [hasConfiguredHall, normalizedGuestsCount, seatSelectionEnabled, selectedSeatIds.length, selectedTable, tableId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setError(null);
    setMessage(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fallbackTableId = String(form.get("fallbackTableId") || "");
    const selectedFallbackTable = tables.find((table) => table.id === fallbackTableId) || null;
    const currentTableId = tableId || fallbackTableId || "";
    const currentTable = selectedTable || selectedFallbackTable;

    if (timeError) {
      setError(timeError);
      setPending(false);
      submittingRef.current = false;
      return;
    }
    if (selectionError) {
      setError(selectionError);
      setPending(false);
      submittingRef.current = false;
      return;
    }
    if (!isValidRuPhone(customerPhone)) {
      setPhoneError("Введите корректный номер телефона.");
      setError("Введите корректный номер телефона.");
      setPending(false);
      submittingRef.current = false;
      return;
    }

    const payload = {
      reservationDate,
      startTime,
      endTime,
      guestsCount: normalizedGuestsCount,
      customerName: customerName.trim() || String(form.get("customerName") || ""),
      customerPhone: normalizePhone(customerPhone),
      customerEmail: null,
      comment: String(form.get("comment") || ""),
      tableId: currentTableId || null,
      hallId: currentTable?.hallId || null,
      selectedSeatNumbers: selectedSeatIds,
      verificationSessionId: verification.status === "confirmed" ? verification.sessionId : null,
      source,
    };

    try {
      const data = await fetchJsonWithDiagnostics<{
        reservation?: { id: string; confirmationToken?: string | null };
        payment?: { paymentUrl?: string | null; amount?: number | null; status?: string | null };
        pricing?: Pricing;
        paymentTermsText?: string | null;
        paymentDisclaimer?: string | null;
        message?: string;
      }>(`/api/public/restaurants/${restaurantKey}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Lets the server resolve the VK user id (for status notifications)
          // from the signed VK Mini App session, when booking from inside VK.
          ...(source === "vk-mini-app" && getStoredVkMiniToken()
            ? { "x-vk-mini-session": getStoredVkMiniToken() as string }
            : {}),
        },
        body: JSON.stringify(payload),
        debugLabel: "create-reservation",
        userMessage: "Не удалось отправить заявку. Проверьте данные и попробуйте еще раз.",
        logPayload: payload,
      });

      setSuccessSummary({
        restaurantTitle,
        reservationDate,
        startTime,
        endTime,
        guestsCount: normalizedGuestsCount,
        customerName: payload.customerName,
        customerPhone,
        normalizedPhone: payload.customerPhone,
        tableNumber: currentTable?.number || null,
        seatsCount: selectedSeatIds.length || normalizedGuestsCount,
        confirmationUrl: data.reservation?.confirmationToken ? `/reservation/confirm/${data.reservation.confirmationToken}` : null,
        qrUrl: data.reservation?.confirmationToken ? `/api/public/reservations/confirm/${encodeURIComponent(data.reservation.confirmationToken)}/qr` : null,
        paymentUrl: data.payment?.paymentUrl || null,
        paymentTermsText: data.paymentTermsText || null,
        paymentDisclaimer: data.paymentDisclaimer || null,
        depositAmount: data.payment?.amount ?? data.pricing?.depositAmount ?? pricing?.depositAmount ?? 0,
        isDepositRequired: Boolean(data.pricing?.isDepositRequired ?? pricing?.isDepositRequired),
      });

      formElement.reset();
      if (isAuthenticatedGuest) {
        setCustomerPhone(initialFormattedPhone);
        setCustomerName(payload.customerName || initialCustomerName?.trim() || "");
      } else {
        setCustomerPhone("");
        setCustomerName("");
      }
      setPhoneError(null);
      setVerification({ provider: null, status: "idle" });
      resetVisualSelection("reservation_created");
      setReservationDate(localDateInputValue());
      setGuestsCount(2);
      setMessage(data.message || "Заявка отправлена. Ресторан свяжется с вами для подтверждения.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить заявку. Проверьте данные и попробуйте еще раз.");
    } finally {
      setPending(false);
      submittingRef.current = false;
    }
  }

  // ── Display-only derived state for the stepper / live summary / CTA.
  // Everything below is computed from EXISTING state — no new React state, no
  // change to submit/payload/verification. It only presents progress + reasons.
  const isPhoneValid = isValidRuPhone(customerPhone);
  const isNameFilled = Boolean(customerName.trim());
  const verificationSatisfied = !mustConfirmPhone || verification.status === "confirmed";
  const stepWhenDone = !timeError && Boolean(startTime) && Boolean(endTime);
  const stepWhereDone = !hasConfiguredHall || (Boolean(tableId) && !selectionError);
  const stepWhoDone = isNameFilled && isPhoneValid && verificationSatisfied;
  const activeStep = !stepWhenDone ? "when" : !stepWhereDone ? "where" : "who";
  // Reason the submit is not yet possible (covers — and never weakens — the
  // original disabled gate: timeError / selectionError / required verification,
  // plus name + phone which the submit handler already enforces).
  const submitBlockedReason = timeError
    ? "Выберите дату и время"
    : selectionError
      ? selectionError
      : !isNameFilled
        ? "Введите имя"
        : !isPhoneValid
          ? "Введите телефон"
          : !verificationSatisfied
            ? "Подтвердите телефон"
            : null;
  const canSubmit = !pending && !submitBlockedReason;

  function pluralGuests(n: number) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "гость";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "гостя";
    return "гостей";
  }

  function scrollToStep(id: string) {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <>
      <form id="bookingForm" className="panel reservation-form" onSubmit={submit}>
        <ol className="booking-stepper" aria-label="Шаги бронирования">
          <li className={`booking-stepper-item ${activeStep === "when" ? "is-active" : ""} ${stepWhenDone ? "is-done" : ""}`}>
            <button type="button" onClick={() => scrollToStep("step-when")}>
              <span className="booking-stepper-num">{stepWhenDone ? <CheckCircle2 size={17} aria-hidden /> : "1"}</span>
              <span className="booking-stepper-text"><strong>Когда</strong><small>Дата и время</small></span>
            </button>
          </li>
          <li className={`booking-stepper-item ${activeStep === "where" ? "is-active" : ""} ${stepWhereDone ? "is-done" : ""}`}>
            <button type="button" onClick={() => scrollToStep("step-where")}>
              <span className="booking-stepper-num">{stepWhereDone ? <CheckCircle2 size={17} aria-hidden /> : "2"}</span>
              <span className="booking-stepper-text"><strong>Где</strong><small>Стол</small></span>
            </button>
          </li>
          <li className={`booking-stepper-item ${activeStep === "who" ? "is-active" : ""} ${stepWhoDone ? "is-done" : ""}`}>
            <button type="button" onClick={() => scrollToStep("step-who")}>
              <span className="booking-stepper-num">{stepWhoDone ? <CheckCircle2 size={17} aria-hidden /> : "3"}</span>
              <span className="booking-stepper-text"><strong>Контакты</strong><small>Имя и телефон</small></span>
            </button>
          </li>
        </ol>

        <div className="booking-step-list">
        <section id="step-when" className={`booking-step ${activeStep === "when" ? "is-active" : ""} ${stepWhenDone ? "is-done" : ""}`} aria-labelledby="step-when-title">
          <header className="booking-step-head">
            <span className="booking-step-num">{stepWhenDone ? <CheckCircle2 size={18} aria-hidden /> : "1"}</span>
            <div className="booking-step-heading">
              <h3 id="step-when-title">Когда</h3>
              <p>Выберите дату, время и количество гостей</p>
            </div>
          </header>
        <div className="form-grid two booking-contact-fields">
          <DatePickerField
            label="Дата"
            max={maxReservationDate}
            min={localDateInputValue()}
            name="reservationDate"
            onChange={(value) => {
              setReservationDate(value);
              resetVisualSelection("date_changed");
            }}
            value={reservationDate}
          />
          <TimeSlotPicker
            disabled={!startTimeOptions.length}
            emptyMessage={isReservationDateTooFar ? `Выберите дату не позже ${formatDateInputRu(maxReservationDate)}` : hasWorkingHours && activeWorkingHour?.isClosed ? "Ресторан не работает в выбранный день" : "На выбранную дату нет доступного времени"}
            label="Время начала"
            name="startTime"
            onChange={handleStartTimeChange}
            slots={startTimeOptions}
            value={startTime}
          />
          <TimeSlotPicker
            disabled={!startTime || !endTimeOptions.length}
            emptyMessage="Сначала выберите время начала"
            label="Время окончания"
            name="endTime"
            onChange={(value) => { setEndTime(value); resetVisualSelection("end_time_changed"); }}
            slots={endTimeOptions}
            value={endTime}
          />
          <label>
            <span>Количество гостей</span>
            <input name="guestsCount" type="number" min="1" max={selectedTableCapacity ?? undefined} value={guestsCount} onChange={(event) => handleGuestsInputChange(event.target.value)} required />
          </label>
        </div>
        {timeError ? <p className="form-warning booking-step-error" role="alert">{timeError}</p> : null}
        </section>

        <section id="step-where" className={`booking-step ${activeStep === "where" ? "is-active" : ""} ${stepWhereDone ? "is-done" : ""}`} aria-labelledby="step-where-title">
          <header className="booking-step-head">
            <span className="booking-step-num">{stepWhereDone ? <CheckCircle2 size={18} aria-hidden /> : "2"}</span>
            <div className="booking-step-heading">
              <h3 id="step-where-title">Где</h3>
              <p>Выберите стол на схеме зала</p>
            </div>
          </header>
        {hasConfiguredHall && !timeError ? (
          <PublicHallBookingWidget
            guestsCount={guestsCount}
            onGuestsCountChange={setGuestsCount}
            onPricingChange={handlePricingChange}
            onSeatSelectionAvailability={setSeatSelectionEnabled}
            onSelectSeats={setSelectedSeatIds}
            onSelectTable={handleSelectTable}
            restaurantKey={restaurantKey}
            selectedDate={reservationDate}
            selectedEndTime={endTime}
            selectedSeatIds={selectedSeatIds}
            selectedStartTime={startTime}
            selectedTableId={tableId}
          />
        ) : hasConfiguredHall ? (
          <div className="hall-widget-state">
            <strong>Выберите доступное время</strong>
            <span>{timeError || "После выбора времени покажем свободные столы."}</span>
          </div>
        ) : tables.length ? (
          <PrettySelect
            name="fallbackTableId"
            label="Стол"
            options={[
              { label: "Пусть ресторан подберет стол", value: "" },
              ...tables.map((table) => ({
                label: `${table.hallTitle}: стол ${table.number}, ${table.minGuests || 1}-${table.maxGuests || table.seats} гостей${table.tableType ? `, ${table.tableType.title}` : ""}`,
                value: table.id,
              })),
            ]}
          />
        ) : (
          <div className="hall-widget-state">
            <strong>Ресторан пока не добавил столы для онлайн-выбора.</strong>
            <span>Отправьте заявку, и менеджер подберет подходящий стол.</span>
          </div>
        )}

        <div className={`booking-link-box ${pricing?.isDepositRequired ? "" : "soft-box"}`}>
          <strong>{pricingPending ? "Обновляем условия..." : pricing?.isDepositRequired ? `Депозит ${formatRub(pricing.depositAmount)}` : "Депозит не требуется"}</strong>
          <span>{pricing?.explanation || "Этот стол можно выбрать без предоплаты. Если ресторан попросит подтвердить визит, ссылка придет отдельно."}</span>
          {selectedTable ? <small>Вы выбрали: стол {selectedTable.number}, мест: {selectedSeatIds.length || guestsCount}</small> : null}
        </div>
        {selectionError ? <p className="form-warning booking-step-error" role="alert">{selectionError}</p> : null}
        </section>

        <section id="step-who" className={`booking-step ${activeStep === "who" ? "is-active" : ""} ${stepWhoDone ? "is-done" : ""}`} aria-labelledby="step-who-title">
          <header className="booking-step-head">
            <span className="booking-step-num">{stepWhoDone ? <CheckCircle2 size={18} aria-hidden /> : "3"}</span>
            <div className="booking-step-heading">
              <h3 id="step-who-title">Контакты</h3>
              <p>Как с вами связаться</p>
            </div>
          </header>
        <div className="form-grid two">
          <label>
            <span>Имя</span>
            <input name="customerName" autoComplete="name" value={customerName} onChange={(event) => handleNameChange(event.target.value)} required />
          </label>
          <label>
            <span>Телефон</span>
            <input name="customerPhone" autoComplete="tel" inputMode="tel" maxLength={18} placeholder="+7 (999) 123-45-67" readOnly={isAuthenticatedGuest} value={customerPhone} onBlur={() => { if (customerPhone && !isValidRuPhone(customerPhone)) setPhoneError("Введите корректный номер телефона."); }} onChange={(event) => handlePhoneChange(event.target.value)} required />
            {phoneError ? <small className="field-error">{phoneError}</small> : null}
          </label>
        </div>

        {isAuthenticatedGuest ? (
          <div className="verification-box guest-session-box">
            <div className="verification-copy">
              <span className="verification-icon"><ShieldCheck size={18} aria-hidden /></span>
              <div>
                <strong>Вы вошли в личный кабинет</strong>
                <p>
                  Заявка сохранится в разделе «Мои брони» для номера {customerPhone}. Повторно подтверждать телефон через MAX или VK не нужно.
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div className="guest-auth-inline">
          <div className="guest-vkid-panel">
            <div>
              <strong>{mustConfirmPhone ? "Подтвердите телефон, чтобы отправить заявку" : "Быстрый вход через VK ID"}</strong>
              <span>Подтвердим заявку через VK — бронь сразу попадёт в «Мои брони». Черновик сохранится.</span>
            </div>
            <button className="button icon-text full" type="button" disabled={vkIdPending || verificationPending} onClick={startVkIdLogin}>
              {vkIdPending ? "Открываем VK ID..." : "Войти через VK ID"}
              <ArrowRight size={17} aria-hidden />
            </button>
          </div>

          <div className={`guest-messenger-panel guest-messenger-${verification.status}`}>
            {verification.status !== "pending" ? (
              <details className="guest-other-method">
                <summary><span>Другой способ подтверждения</span></summary>
                <div className="guest-messenger-copy">
                  <KeyRound size={18} aria-hidden />
                  <div>
                    <strong>Подтверждение через сообщество</strong>
                    <span>
                      {mustConfirmPhone
                        ? "Если VK ID недоступен — подтвердите в чате. Через VK-сообщество код вводить не нужно."
                        : "Если VK ID недоступен — подтвердите в чате. Через VK-сообщество код вводить не нужно. Отправить заявку можно и без подтверждения."}
                    </span>
                  </div>
                </div>
                <div className="guest-messenger-actions">
                  <button className="verification-button" type="button" disabled={verificationPending} onClick={() => startMessengerVerification("vk")}>
                    <MessageCircle size={16} aria-hidden />
                    VK-сообщество
                  </button>
                  <button className="verification-button" type="button" disabled={verificationPending} onClick={() => startMessengerVerification("max")}>
                    <MessageCircle size={16} aria-hidden />
                    MAX
                  </button>
                </div>
                {verification.status === "failed" && verification.message ? <p className="form-warning" style={{ margin: 0 }}>{verification.message}</p> : null}
              </details>
            ) : (
              <div className="guest-code-flow">
                <div className="guest-code-flow-head">
                  <strong>Подтверждение через {verification.provider === "vk" ? "VK-сообщество" : "MAX"}</strong>
                  <button type="button" className="guest-code-change" onClick={() => { setVerification({ provider: null, status: "idle" }); setVerificationCode(""); }}>
                    Другой способ
                  </button>
                </div>
                <ol className="guest-code-steps">
                  <li className="guest-code-step">
                    <span className="guest-step-num">1</span>
                    <div className="guest-step-body">
                      <p>Скопируйте команду</p>
                      <div className="guest-code-command">
                        <code>{verification.commandText}</code>
                        <button type="button" onClick={copyCommand}>
                          <Copy size={14} aria-hidden />
                          {copied ? "Скопировано" : "Копировать"}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="guest-code-step">
                    <span className="guest-step-num">2</span>
                    <div className="guest-step-body">
                      <p>Откройте {verification.provider === "max" ? "MAX" : "VK"} и отправьте её сообществу</p>
                      <a className="guest-open-app" href={verification.appUrl || verification.confirmUrl || "#"} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} aria-hidden />
                        Открыть {verification.provider === "max" ? "MAX" : "VK"}
                      </a>
                    </div>
                  </li>
                  <li className="guest-code-step">
                    <span className="guest-step-num">3</span>
                    <div className="guest-step-body">
                      {verification.provider === "vk" ? (
                        <>
                          <p>Готово — подтвердится автоматически</p>
                          <span className="guest-await">
                            <Loader2 className="spin" size={16} aria-hidden />
                            Ждём подтверждение из VK...
                          </span>
                        </>
                      ) : (
                        <>
                          <p>Введите 6-значный код из ответа сообщества</p>
                          <input
                            className="guest-code-input"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(event) => {
                              setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                              setError(null);
                            }}
                          />
                          <button
                            className="button icon-text full"
                            type="button"
                            disabled={verificationPending || verificationCode.length !== 6}
                            onClick={confirmMessengerVerification}
                          >
                            {verificationPending ? "Проверяем код..." : "Подтвердить код"}
                            <ArrowRight size={17} aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
        )}

        <label className="booking-comment-field">
          <span>Комментарий <em className="field-optional">необязательно</em></span>
          <textarea className="booking-comment" name="comment" rows={3} />
        </label>
        </section>
        </div>

        <aside className="booking-summary" aria-label="Сводка вашей брони">
          <div className="booking-summary-card">
            <strong className="booking-summary-title">Ваша бронь</strong>
            <ul className="booking-summary-list">
              <li className={stepWhenDone ? "is-set" : ""}>
                <CalendarDays size={16} aria-hidden />
                <span>{reservationDate ? formatDateInputRu(reservationDate) : "Дата не выбрана"}</span>
              </li>
              <li className={startTime && endTime ? "is-set" : ""}>
                <Clock size={16} aria-hidden />
                <span>{startTime && endTime ? `${startTime} – ${endTime}` : "Время не выбрано"}</span>
              </li>
              <li className="is-set">
                <Users size={16} aria-hidden />
                <span>{normalizedGuestsCount} {pluralGuests(normalizedGuestsCount)}</span>
              </li>
              <li className={selectedTable ? "is-set" : ""}>
                <Armchair size={16} aria-hidden />
                <span>{selectedTable ? `Стол ${selectedTable.number} выбран` : hasConfiguredHall ? "Стол не выбран" : "Стол подберёт ресторан"}</span>
              </li>
              {pricing?.isDepositRequired ? (
                <li className="is-set booking-summary-deposit">
                  <CreditCard size={16} aria-hidden />
                  <span>Депозит {formatRub(pricing.depositAmount)}</span>
                </li>
              ) : null}
            </ul>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}

            <button className="button icon-text full booking-submit" type="submit" disabled={!canSubmit}>
              <Send size={17} aria-hidden />
              {pending ? "Отправляем..." : "Отправить заявку"}
            </button>
            {submitBlockedReason && !pending ? <p className="booking-submit-reason" role="status">{submitBlockedReason}</p> : null}
          </div>
        </aside>
      </form>

      {successSummary ? (
        <div className="reservation-success-modal" role="dialog" aria-modal="true" aria-label="Заявка на бронь отправлена">
          <div className="reservation-success-card">
            <button className="modal-close-button" type="button" aria-label="Закрыть" onClick={() => setSuccessSummary(null)}>
              <X size={18} aria-hidden />
            </button>
            <div className="success-modal-head">
              <CheckCircle2 size={38} aria-hidden className="success-modal-icon" />
              <div>
                <p className="eyebrow">{successSummary.isDepositRequired ? "Заявка создана" : "Заявка отправлена"}</p>
                <h2>{successSummary.isDepositRequired ? "Для подтверждения внесите депозит ресторану" : "Ресторан свяжется с вами для подтверждения"}</h2>
              </div>
            </div>
            <div className="success-modal-body">
            <dl className="success-summary-list">
              <div><dt>Ресторан</dt><dd>{successSummary.restaurantTitle}</dd></div>
              <div><dt>Дата и время</dt><dd>{successSummary.reservationDate}, {successSummary.startTime}-{successSummary.endTime}</dd></div>
              <div><dt>Количество гостей</dt><dd>{successSummary.guestsCount}</dd></div>
              <div><dt>Стол</dt><dd>{successSummary.tableNumber ? `Стол ${successSummary.tableNumber}, мест ${successSummary.seatsCount}` : "Менеджер подберет стол"}</dd></div>
              <div><dt>Имя</dt><dd>{successSummary.customerName}</dd></div>
              <div><dt>Телефон</dt><dd>{successSummary.customerPhone}</dd></div>
            </dl>
            <ReservationQrCard
              qrUrl={successSummary.qrUrl}
              title="QR-код вашей брони"
              description="Сохраните или покажите его в ресторане. QR содержит стол, количество мест, имя и телефон для быстрой проверки заявки."
            />
            {successSummary.isDepositRequired ? (
              <div className="deposit-next-step">
                <strong>Сумма депозита: {formatRub(successSummary.depositAmount)}</strong>
                <span>{successSummary.paymentTermsText || "Оплата пройдет напрямую ресторану. После оплаты ресторан проверит платеж и подтвердит бронь."}</span>
                <small>{successSummary.paymentDisclaimer || "Kaifbook не принимает оплату за бронь. Чек, подтверждение оплаты и возврат оформляет ресторан."}</small>
                {successSummary.paymentUrl ? (
                  <Link className="button icon-text full client-cta" href={successSummary.paymentUrl} target="_blank" rel="noopener noreferrer">
                    <CreditCard size={17} aria-hidden />
                    Оплатить депозит
                  </Link>
                ) : (
                  <p className="form-warning">Ссылка на оплату временно недоступна. Свяжитесь с рестораном.</p>
                )}
              </div>
            ) : (
              <p className="form-note">Оплата при бронировании не требуется. Заявка уже передана ресторану.</p>
            )}
            </div>
            <div className="success-modal-actions">
              <Link className="button full" href={myReservationsHref || (isAuthenticatedGuest ? "/guest/reservations" : `/guest/login?phone=${encodeURIComponent(successSummary.normalizedPhone)}&next=${encodeURIComponent("/guest/reservations")}`)}>
                Посмотреть мои брони
              </Link>
              {successSummary.confirmationUrl ? (
                <Link className="secondary-button full" href={successSummary.confirmationUrl}>
                  Управлять этой бронью
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
