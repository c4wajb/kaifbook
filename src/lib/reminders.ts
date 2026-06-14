import { prisma } from "@/lib/db";
import { dayOfWeekFromDate, resolveVisitInstant } from "@/lib/time";
import { sendReservationMessageToGuest } from "@/lib/verifications";

// The true UTC instant of a visit is resolved by resolveVisitInstant (lib/time):
// reservation date + Moscow wall-clock startTime − tz offset, rolling
// after-midnight slots of an overnight night onto the next day.

// Confirmed, upcoming bookings the guest is expected to attend. We never remind
// about pending/awaiting bookings (the restaurant may still reject them) or
// terminal ones (cancelled, completed, no-show).
const REMINDER_STATUSES = ["confirmed", "confirmed_by_restaurant", "confirmed_by_guest", "deposit_paid"];

function appPublicUrl() {
  return (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function confirmationUrl(token: string | null) {
  return token ? `${appPublicUrl()}/reservation/confirm/${token}` : appPublicUrl();
}

function formatVisitDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" }).format(date);
}

export type ReminderSummary = {
  scanned: number;
  firstReminders: number;
  secondReminders: number;
  confirmationRequests: number;
  markedAtRisk: number;
};

type ReminderReservation = {
  id: string;
  customerName: string;
  customerPhone: string;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  confirmationToken: string | null;
  guestConfirmedAt: Date | null;
  confirmationRequestedAt: Date | null;
  reminderSentAt: Date | null;
  secondReminderSentAt: Date | null;
  markedAtRiskAt: Date | null;
  verificationProvider: string | null;
  verifiedExternalChatId: string | null;
  verifiedExternalUserId: string | null;
  restaurant: { title: string };
};

/**
 * Process every restaurant's no-show settings and send any reminders /
 * confirmation requests that have come due, and auto-flag bookings the guest
 * didn't confirm in time. Idempotent: each action is guarded by a "*SentAt"
 * timestamp so it fires at most once. Meant to run from a periodic cron tick.
 */
export async function processDueReminders(now = new Date()): Promise<ReminderSummary> {
  const summary: ReminderSummary = { scanned: 0, firstReminders: 0, secondReminders: 0, confirmationRequests: 0, markedAtRisk: 0 };

  const settingsList = await prisma.noShowSettings.findMany({
    where: { OR: [{ reminderEnabled: true }, { secondReminderEnabled: true }, { requireGuestConfirmation: true }, { autoMarkAtRiskEnabled: true }] },
  });

  for (const settings of settingsList) {
    const widestWindowMinutes = Math.max(
      settings.reminderEnabled ? settings.reminderHoursBefore * 60 : 0,
      settings.secondReminderEnabled ? settings.secondReminderMinutesBefore : 0,
      settings.requireGuestConfirmation && settings.autoMarkAtRiskEnabled ? settings.confirmationDeadlineMinutesBefore : 0,
    );
    if (widestWindowMinutes <= 0) continue;

    // reservationDate is UTC-midnight; pre-filter by date with generous padding
    // for the time-of-day, then gate precisely on the real visit instant below.
    const fromDate = new Date(now.getTime() - 36 * 3600_000);
    const toDate = new Date(now.getTime() + widestWindowMinutes * 60_000 + 24 * 3600_000);

    const reservations = (await prisma.reservation.findMany({
      where: {
        restaurantId: settings.restaurantId,
        status: { in: REMINDER_STATUSES },
        reservationDate: {
          gte: new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())),
          lte: toDate,
        },
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        confirmationToken: true,
        guestConfirmedAt: true,
        confirmationRequestedAt: true,
        reminderSentAt: true,
        secondReminderSentAt: true,
        markedAtRiskAt: true,
        verificationProvider: true,
        verifiedExternalChatId: true,
        verifiedExternalUserId: true,
        restaurant: { select: { title: true } },
      },
    })) as ReminderReservation[];

    const workingHours = await prisma.restaurantWorkingHour.findMany({
      where: { restaurantId: settings.restaurantId },
      select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
    });

    for (const reservation of reservations) {
      summary.scanned += 1;
      const workingHour = workingHours.find((hour) => hour.dayOfWeek === dayOfWeekFromDate(reservation.reservationDate)) ?? null;
      const visitAt = resolveVisitInstant(reservation.reservationDate, reservation.startTime, workingHour);
      const minutesUntil = (visitAt.getTime() - now.getTime()) / 60_000;
      if (minutesUntil <= 0) continue; // visit already started or passed

      const wantsConfirmation = settings.requireGuestConfirmation && !reservation.guestConfirmedAt;
      const confirmLine = wantsConfirmation ? ` Подтвердите визит по ссылке: ${confirmationUrl(reservation.confirmationToken)}` : "";

      // 1) First reminder (carries the confirmation ask). Skip if we're already
      // inside the second-reminder window so a last-minute booking doesn't get
      // two messages back to back.
      const insideSecondWindow = settings.secondReminderEnabled && minutesUntil <= settings.secondReminderMinutesBefore;
      if (settings.reminderEnabled && !reservation.reminderSentAt && minutesUntil <= settings.reminderHoursBefore * 60 && !insideSecondWindow) {
        const message = `Kaifbook: напоминаем о брони в «${reservation.restaurant.title}» ${formatVisitDate(visitAt)} в ${reservation.startTime}. Будем рады видеть вас!${confirmLine}`;
        await sendReservationMessageToGuest(reservation, message);
        const data: { reminderSentAt: Date; confirmationRequestedAt?: Date } = { reminderSentAt: now };
        if (wantsConfirmation && !reservation.confirmationRequestedAt) {
          data.confirmationRequestedAt = now;
          summary.confirmationRequests += 1;
        }
        await prisma.reservation.update({ where: { id: reservation.id }, data });
        summary.firstReminders += 1;
        continue; // one action per reservation per tick
      }

      // 2) Second reminder closer to the visit.
      if (settings.secondReminderEnabled && !reservation.secondReminderSentAt && minutesUntil <= settings.secondReminderMinutesBefore) {
        const message = `Kaifbook: скоро ваш визит в «${reservation.restaurant.title}» ${formatVisitDate(visitAt)} в ${reservation.startTime}. Если планы изменились — пожалуйста, отмените бронь заранее.${confirmLine}`;
        await sendReservationMessageToGuest(reservation, message);
        const data: { secondReminderSentAt: Date; confirmationRequestedAt?: Date } = { secondReminderSentAt: now };
        if (wantsConfirmation && !reservation.confirmationRequestedAt) {
          data.confirmationRequestedAt = now;
          summary.confirmationRequests += 1;
        }
        await prisma.reservation.update({ where: { id: reservation.id }, data });
        summary.secondReminders += 1;
        continue;
      }

      // 3) Guest didn't confirm before the deadline → flag the booking as risky
      // so the restaurant sees it. Only meaningful when confirmation was asked.
      if (
        settings.autoMarkAtRiskEnabled &&
        settings.requireGuestConfirmation &&
        !reservation.guestConfirmedAt &&
        !reservation.markedAtRiskAt &&
        minutesUntil <= settings.confirmationDeadlineMinutesBefore
      ) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { markedAtRiskAt: now, noShowRiskLevel: "high", noShowRiskScore: 70 },
        });
        summary.markedAtRisk += 1;
      }
    }
  }

  return summary;
}
