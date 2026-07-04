const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export function timeToMinutes(value: string): number {
  if (!TIME_PATTERN.test(value)) throw new Error("Time must be in HH:mm format");
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
export function minutesToTime(value: number): string {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}
export function addMinutesToTime(value: string, minutesToAdd: number): string {
  const total = (timeToMinutes(value) + minutesToAdd) % (24 * 60);
  return minutesToTime(total);
}
export function normalizedEndMinutes(startMinutes: number, endMinutes: number) {
  return endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
}
export function timesOverlap(newStart: string, newEnd: string, existingStart: string, existingEnd: string): boolean {
  const start = timeToMinutes(newStart);
  const end = normalizedEndMinutes(start, timeToMinutes(newEnd));
  const existingStartMinutes = timeToMinutes(existingStart);
  const existingEndMinutes = normalizedEndMinutes(existingStartMinutes, timeToMinutes(existingEnd));
  return start < existingEndMinutes && end > existingStartMinutes;
}
export function dateFromInput(value: string | Date): Date {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Date must be in YYYY-MM-DD format");
  return new Date(`${value}T00:00:00.000Z`);
}
export function dateInputValue(value: Date): string { return value.toISOString().slice(0, 10); }
export function localDateInputValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function todayUtcMidnight(): Date { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }
export function isPastReservationDate(value: Date): boolean { return value.getTime() < todayUtcMidnight().getTime(); }
export function dayOfWeekFromDate(value: Date): number { return value.getUTCDay(); }
export function formatDateRu(value: Date): string { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value); }

export type WorkingHourLike = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export function dayOfWeekFromInput(value: string) {
  return dayOfWeekFromDate(dateFromInput(value));
}

export function workingHourForDate(dateInput: string, workingHours: WorkingHourLike[] | null | undefined) {
  if (!workingHours?.length) return null;
  const dayOfWeek = dayOfWeekFromInput(dateInput);
  return workingHours.find((item) => item.dayOfWeek === dayOfWeek) ?? null;
}

function normalizedCloseMinutes(openMinutes: number, closeMinutes: number) {
  return closeMinutes <= openMinutes ? closeMinutes + 24 * 60 : closeMinutes;
}

function ceilToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

export function isRangeWithinWorkingHours(startTime: string, endTime: string, workingHour: WorkingHourLike | null | undefined) {
  if (!workingHour || workingHour.isClosed) return false;
  const openMinutes = timeToMinutes(workingHour.openTime);
  const closeMinutes = normalizedCloseMinutes(openMinutes, timeToMinutes(workingHour.closeTime));
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = normalizedEndMinutes(startMinutes, timeToMinutes(endTime));

  if (closeMinutes > 24 * 60 && startMinutes < openMinutes) {
    startMinutes += 24 * 60;
    endMinutes = normalizedEndMinutes(startMinutes, timeToMinutes(endTime) + 24 * 60);
  }

  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

const DEFAULT_TZ_OFFSET_MINUTES = 180; // Europe/Moscow (UTC+3, no DST).

export function appTzOffsetMinutes(): number {
  const raw = process.env.APP_TZ_OFFSET_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_TZ_OFFSET_MINUTES;
}

/**
 * "Now" as Moscow wall-clock, derived from the TZ-independent epoch so the
 * server (UTC) and the client (any device TZ) agree — avoids hydration
 * mismatches and wrong-day/time bugs in client components. Returns the date
 * input string (YYYY-MM-DD), day-of-week and minutes-of-day in Moscow time.
 */
export function appWallClockNow(now: Date = new Date()): { dateInput: string; dayOfWeek: number; minutes: number } {
  const shifted = new Date(now.getTime() + appTzOffsetMinutes() * 60_000);
  const dateInput = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
  return { dateInput, dayOfWeek: shifted.getUTCDay(), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

// A slot before opening on an overnight working day (one that closes the next
// calendar day) belongs to the morning AFTER the picked date.
export function isAfterMidnightSlot(startTime: string, workingHour: WorkingHourLike | null | undefined): boolean {
  if (!workingHour || workingHour.isClosed) return false;
  const open = timeToMinutes(workingHour.openTime);
  const close = timeToMinutes(workingHour.closeTime);
  if (close > open) return false; // closes the same day — not overnight
  return timeToMinutes(startTime) < open;
}

// Minutes from the picked date's local midnight to the slot start, with
// after-midnight slots of an overnight night rolled onto the next day (1440+).
export function slotStartOffsetMinutes(startTime: string, workingHour: WorkingHourLike | null | undefined): number {
  return timeToMinutes(startTime) + (isAfterMidnightSlot(startTime, workingHour) ? 24 * 60 : 0);
}

// True UTC instant of a visit. reservationDate is the picked day's UTC midnight;
// startTime is the local (Moscow) wall-clock. After-midnight slots roll to the
// next day, and the local→UTC offset is applied explicitly (server clock is UTC).
export function resolveVisitInstant(reservationDate: Date, startTime: string, workingHour: WorkingHourLike | null | undefined): Date {
  return new Date(reservationDate.getTime() + (slotStartOffsetMinutes(startTime, workingHour) - appTzOffsetMinutes()) * 60_000);
}

// Overlap test for two same-day reservations that stays correct across midnight:
// each [start, end] becomes an absolute minute range from the date's midnight
// (after-midnight slots rolled to 1440+). For daytime hours this is identical to
// timesOverlap.
export function slotRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
  workingHour: WorkingHourLike | null | undefined,
): boolean {
  const aStartAbs = slotStartOffsetMinutes(aStart, workingHour);
  const aEndAbs = aStartAbs + (normalizedEndMinutes(timeToMinutes(aStart), timeToMinutes(aEnd)) - timeToMinutes(aStart));
  const bStartAbs = slotStartOffsetMinutes(bStart, workingHour);
  const bEndAbs = bStartAbs + (normalizedEndMinutes(timeToMinutes(bStart), timeToMinutes(bEnd)) - timeToMinutes(bStart));
  return aStartAbs < bEndAbs && bStartAbs < aEndAbs;
}

export type TimeSlotOptions = {
  date: string;
  workingHours: WorkingHourLike[] | null | undefined;
  stepMinutes: number;
  minBookingDurationMinutes: number;
  now?: Date;
  preparationBufferMinutes?: number;
};

export function generateStartTimeSlots(options: TimeSlotOptions): string[] {
  const workingHour = workingHourForDate(options.date, options.workingHours);
  if (!workingHour || workingHour.isClosed) return [];

  const step = options.stepMinutes || 15;
  const openMinutes = timeToMinutes(workingHour.openTime);
  const closeMinutes = normalizedCloseMinutes(openMinutes, timeToMinutes(workingHour.closeTime));
  const lastStart = closeMinutes - Math.max(15, options.minBookingDurationMinutes);
  let firstStart = openMinutes;

  // Filter out past slots in Moscow wall-clock (consistent on server + any
  // client device), not the renderer's local timezone.
  const wall = appWallClockNow(options.now);
  if (options.date === wall.dateInput) {
    firstStart = Math.max(firstStart, wall.minutes + (options.preparationBufferMinutes ?? 30));
  }

  const slots: string[] = [];
  for (let minutes = ceilToStep(firstStart, step); minutes <= lastStart; minutes += step) {
    slots.push(minutesToTime(minutes));
  }
  return Array.from(new Set(slots));
}

export function generateEndTimeSlots(options: {
  date: string;
  workingHours: WorkingHourLike[] | null | undefined;
  selectedStartTime: string;
  stepMinutes: number;
  minBookingDurationMinutes: number;
}) {
  const workingHour = workingHourForDate(options.date, options.workingHours);
  if (!workingHour || workingHour.isClosed || !options.selectedStartTime) return [];

  const step = options.stepMinutes || 15;
  const openMinutes = timeToMinutes(workingHour.openTime);
  const closeMinutes = normalizedCloseMinutes(openMinutes, timeToMinutes(workingHour.closeTime));
  let startMinutes = timeToMinutes(options.selectedStartTime);
  if (closeMinutes > 24 * 60 && startMinutes < openMinutes) startMinutes += 24 * 60;

  const slots: string[] = [];
  for (let minutes = ceilToStep(startMinutes + Math.max(60, options.minBookingDurationMinutes), step); minutes <= closeMinutes; minutes += step) {
    slots.push(minutesToTime(minutes));
  }
  return Array.from(new Set(slots));
}
