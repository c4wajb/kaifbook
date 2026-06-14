import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { EXTERNAL_PAYMENT_STATUSES, RESERVATION_STATUSES, RESTAURANT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { DEFAULT_EXTERNAL_PAYMENT_TERMS, applyExternalDepositToPricing, hasExternalDepositEnabled } from "@/lib/external-payments";
import { formatGuests } from "@/lib/format";
import { expireOverdueDepositPayments } from "@/lib/payments";
import { normalizePhone, phoneAccountEmail } from "@/lib/phone";
import { calculateReservationPrice } from "@/lib/reservation-pricing";
import { addMinutesToTime, dateFromInput, dayOfWeekFromDate, isPastReservationDate, isRangeWithinWorkingHours, normalizedEndMinutes, resolveVisitInstant, slotRangesOverlap, timeToMinutes, todayUtcMidnight, type WorkingHourLike } from "@/lib/time";
import { notifyGuestReservationStatus, notifyRestaurantReservationEvent, resolveConfirmedVerificationSession, resolveVerifiedVkPhone, sendMessengerMessage } from "@/lib/verifications";

const CANCELLED_OR_REJECTED_STATUSES = [
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
  RESERVATION_STATUSES.REJECTED,
] as string[];

const CANCELLED_STATUSES = [
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
] as string[];

const DAY_MS = 24 * 60 * 60 * 1000;

function assertWithinMaxAdvance(reservationDate: Date, maxAdvanceBookingDays?: number | null) {
  const maxAdvanceDays = Math.max(1, Math.trunc(maxAdvanceBookingDays ?? 30));
  const maxReservationDate = new Date(todayUtcMidnight().getTime() + maxAdvanceDays * DAY_MS);
  if (reservationDate.getTime() > maxReservationDate.getTime()) {
    throw new ApiError(400, `Этот ресторан принимает брони максимум на ${maxAdvanceDays} дней вперед.`);
  }
}

export type ReservationRequest = {
  hallId?: string | null;
  tableId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  guestsCount: number;
  reservationDate: string;
  startTime: string;
  endTime?: string | null;
  selectedSeatNumbers?: Array<string | number> | string | null;
  verificationSessionId?: string | null;
  source?: "web" | "vk-mini-app" | string | null;
  occasion?: string | null;
  comment?: string | null;
};

export function normalizeSeatNumbers(value: ReservationRequest["selectedSeatNumbers"]) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : value.split(",");
          } catch {
            return value.split(",");
          }
        })()
      : [];
  const normalized = raw.map((item) => String(item).trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

function assertValidTimeRange(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const rawEnd = timeToMinutes(endTime);
  if (start === rawEnd) throw new ApiError(400, "Время окончания должно быть позже времени начала.");
  const end = normalizedEndMinutes(start, rawEnd);
  if (start >= end) throw new ApiError(400, "Время окончания должно быть позже времени начала.");
  if (end - start < 60) throw new ApiError(400, "Минимальная длительность бронирования — 1 час.");
}

export function isWithinWorkingHours(startTime: string, endTime: string, workingHour: { openTime: string; closeTime: string; isClosed: boolean } | null) {
  return isRangeWithinWorkingHours(startTime, endTime, workingHour ? { ...workingHour, dayOfWeek: 0 } : null);
}

export async function findTableConflict(input: { tableId: string; reservationDate: Date; startTime: string; endTime: string; excludeReservationId?: string; workingHour?: WorkingHourLike | null }) {
  const occupyingStatuses = [
    RESERVATION_STATUSES.NEW,
    RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
    RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
    RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT,
    RESERVATION_STATUSES.DEPOSIT_PAID,
    RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
    RESERVATION_STATUSES.CONFIRMED,
    RESERVATION_STATUSES.SEATED,
  ];
  const existing = await prisma.reservation.findMany({
    where: {
      tableId: input.tableId,
      reservationDate: input.reservationDate,
      status: { in: occupyingStatuses },
      id: input.excludeReservationId ? { not: input.excludeReservationId } : undefined,
    },
    select: { id: true, startTime: true, endTime: true, customerName: true, status: true },
  });

  return existing.find((reservation) => slotRangesOverlap(input.startTime, input.endTime, reservation.startTime, reservation.endTime, input.workingHour ?? null)) ?? null;
}

export async function validateReservationBusinessRules(restaurantId: string, input: ReservationRequest, options: { allowInactiveRestaurant?: boolean; excludeReservationId?: string } = {}) {
  const reservationDate = dateFromInput(input.reservationDate);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { workingHours: true, settings: true } });
  if (!restaurant) throw new ApiError(404, "Ресторан не найден");

  const endTime = input.endTime || addMinutesToTime(input.startTime, restaurant.settings?.reservationDurationMinutes ?? 120);
  assertValidTimeRange(input.startTime, endTime);

  if (!options.allowInactiveRestaurant && (!restaurant.isActive || restaurant.status !== RESTAURANT_STATUSES.APPROVED)) throw new ApiError(400, "Ресторан сейчас не принимает заявки.");
  if (input.guestsCount <= 0) throw new ApiError(400, "Укажите хотя бы одного человека.");
  if (restaurant.settings && (input.guestsCount < restaurant.settings.minGuests || input.guestsCount > restaurant.settings.maxGuests)) throw new ApiError(400, `Можно указать от ${restaurant.settings.minGuests} до ${restaurant.settings.maxGuests} человек.`);
  if (isPastReservationDate(reservationDate)) throw new ApiError(400, "Выберите сегодняшнюю или будущую дату.");
  assertWithinMaxAdvance(reservationDate, restaurant.settings?.maxAdvanceBookingDays);

  const workingHour = restaurant.workingHours.find((item) => item.dayOfWeek === dayOfWeekFromDate(reservationDate)) ?? null;
  if (!isWithinWorkingHours(input.startTime, endTime, workingHour)) throw new ApiError(400, "В это время ресторан закрыт. Выберите другое время.");

  // Minimum advance notice (the client filters slots by this, but the API must
  // enforce it too so a direct request can't book too close to the visit time).
  const minAdvance = restaurant.settings?.minAdvanceBookingMinutes ?? 0;
  if (!options.allowInactiveRestaurant && minAdvance > 0) {
    const startInstant = resolveVisitInstant(reservationDate, input.startTime, workingHour);
    const minutesUntilStart = (startInstant.getTime() - Date.now()) / 60000;
    if (minutesUntilStart < minAdvance) throw new ApiError(400, `Бронировать можно минимум за ${minAdvance} минут до визита. Выберите время позже.`);
  }

  let table: { id: string; hallId: string; seats: number; isActive: boolean; minGuests: number | null; maxGuests: number | null } | null = null;
  if (input.tableId && restaurant.settings?.allowTableSelection !== false) {
    await expireOverdueDepositPayments(restaurantId);
    table = await prisma.restaurantTable.findFirst({ where: { id: input.tableId, restaurantId }, select: { id: true, hallId: true, seats: true, isActive: true, minGuests: true, maxGuests: true } });
    if (!table || !table.isActive) throw new ApiError(400, "Выбранный стол недоступен");
    if (table.minGuests && input.guestsCount < table.minGuests) throw new ApiError(400, `Этот стол доступен для компании от ${table.minGuests} человек.`);
    if (input.guestsCount > (table.maxGuests ?? table.seats)) throw new ApiError(400, "За этим столом не хватит мест. Выберите другой стол или уменьшите количество человек.");
    const selectedSeats = normalizeSeatNumbers(input.selectedSeatNumbers);
    if (selectedSeats.length > 0) {
      if (restaurant.settings?.allowSeatSelection === false) throw new ApiError(400, "Ресторан не разрешил выбор мест");
      if (selectedSeats.length < (restaurant.settings?.minSeatsSelection ?? 1)) throw new ApiError(400, "Выберите достаточно мест");
      if (selectedSeats.length < input.guestsCount) throw new ApiError(400, "Выберите место для каждого человека.");
      if (selectedSeats.length > input.guestsCount) throw new ApiError(400, "Выбрано больше мест, чем нужно.");
      if (selectedSeats.length > (table.maxGuests ?? table.seats)) throw new ApiError(400, "Количество выбранных мест превышает вместимость стола");
      if (selectedSeats.length > (restaurant.settings?.maxSeatsSelection ?? table.seats)) throw new ApiError(400, "Выбрано слишком много мест");
      if (selectedSeats.length > table.seats) throw new ApiError(400, "Выбрано больше мест, чем есть за столом");
    }
    const conflict = await findTableConflict({ tableId: table.id, reservationDate, startTime: input.startTime, endTime, excludeReservationId: options.excludeReservationId, workingHour });
    if (conflict) throw new ApiError(409, "Этот стол уже занят на выбранное время. Выберите другой.");
  }

  return { restaurant, reservationDate, endTime, hallId: input.hallId || table?.hallId || null, tableId: input.tableId || null };
}

export async function createReservation(restaurantId: string, input: ReservationRequest, userId?: string | null, vkUserId?: string | null) {
  const validated = await validateReservationBusinessRules(restaurantId, input);
  const selectedSeatNumbers = normalizeSeatNumbers(input.selectedSeatNumbers);
  const customerPhone = normalizePhone(input.customerPhone);
  const source = input.source === "vk-mini-app" ? "vk-mini-app" : "web";
  const verification = await resolveConfirmedVerificationSession(input.verificationSessionId, customerPhone);
  // Owner setting "Требовать подтверждение телефона": refuse a booking until the
  // guest has confirmed their number via VK/MAX. VK Mini App bookings are
  // identity-bound by the signed launch params, so they're exempt.
  if (validated.restaurant.settings?.requirePhoneConfirmation && source !== "vk-mini-app" && !verification) {
    throw new ApiError(400, "Этот ресторан подтверждает брони по телефону. Подтвердите номер через VK или MAX и отправьте заявку ещё раз.");
  }
  // For VK Mini App bookings (no chat verification) the VK user id, resolved
  // server-side from the signed session, is the peer for status notifications.
  const vkMiniPeer = source === "vk-mini-app" && vkUserId ? vkUserId : null;
  const customerUserId = userId || (await getOrCreateCustomerUser({ fullName: input.customerName, phone: customerPhone, email: input.customerEmail || null }));
  // The guest's own number stays primary; surface the VK-verified number (from
  // their account or a past VK ID login) so the restaurant has a confirmed one.
  const accountVkPhone = customerUserId
    ? (await prisma.user.findUnique({ where: { id: customerUserId }, select: { vkPhone: true } }))?.vkPhone ?? null
    : null;
  const verifiedVkPhone = verification?.contactPhoneFromProvider || accountVkPhone || (await resolveVerifiedVkPhone(customerPhone));
  const guest = await getOrCreateGuest({ restaurantId, name: input.customerName, phone: customerPhone, email: input.customerEmail || null });
  const pricing = await calculateReservationPrice({ restaurantId, tableId: validated.tableId, guestsCount: input.guestsCount, reservationDate: input.reservationDate, startTime: input.startTime, endTime: validated.endTime, guestId: guest.id, phone: customerPhone });
  const publicPricing = applyExternalDepositToPricing(pricing, validated.restaurant);
  const paymentRequired = publicPricing.isDepositRequired && hasExternalDepositEnabled(validated.restaurant);
  const paymentAmount = paymentRequired ? publicPricing.depositAmount : 0;
  const paymentUrl = paymentRequired ? validated.restaurant.externalPaymentUrl : null;
  const status = paymentRequired
    ? RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT
    : validated.restaurant.settings?.autoConfirmEnabled
      ? RESERVATION_STATUSES.CONFIRMED
      : RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION;
  const confirmationToken = crypto.randomUUID();

  const reservation = await prisma.$transaction(async (tx) => {
    const created = await tx.reservation.create({
      data: {
        restaurantId,
        guestId: guest.id,
        hallId: validated.hallId,
        tableId: validated.tableId,
        selectedSeatNumbers: JSON.stringify(selectedSeatNumbers),
        userId: customerUserId,
        customerName: input.customerName,
        customerPhone,
        customerEmail: input.customerEmail || null,
        guestsCount: input.guestsCount,
        reservationDate: validated.reservationDate,
        startTime: input.startTime,
        endTime: validated.endTime,
        occasion: input.occasion || null,
        comment: input.comment || null,
        status,
        source,
        confirmationToken,
        bookingPrice: publicPricing.bookingPrice,
        depositAmount: paymentAmount,
        isDepositRequired: paymentRequired,
        paymentRequired,
        paymentStatus: paymentRequired ? EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT : EXTERNAL_PAYMENT_STATUSES.NOT_REQUIRED,
        paymentAmount,
        paymentUrl,
        verificationProvider: verification?.provider || (source === "vk-mini-app" ? "vk-mini-app" : null),
        verificationStatus: verification?.status || null,
        verificationSessionId: verification?.id || null,
        verifiedExternalUserId: verification?.externalUserId || vkMiniPeer,
        verifiedExternalChatId: verification?.externalChatId || vkMiniPeer,
        verifiedExternalUsername: verification?.externalUsername || null,
        contactPhoneFromProvider: verifiedVkPhone || null,
        contactPhoneMatched: verifiedVkPhone ? verifiedVkPhone === customerPhone : verification?.contactPhoneMatched ?? null,
        appliedPricingRuleId: publicPricing.appliedRuleId,
        pricingExplanation: paymentRequired
          ? publicPricing.explanation
          : "Оплата при бронировании не требуется.",
        noShowRiskScore: publicPricing.noShowRiskScore,
        noShowRiskLevel: publicPricing.noShowRiskLevel,
        confirmedAt: status === RESERVATION_STATUSES.CONFIRMED ? new Date() : null,
        confirmedByUserId: status === RESERVATION_STATUSES.CONFIRMED ? customerUserId : null,
      },
      include: { restaurant: { select: { title: true, ownerId: true, vkNotifyPeerId: true } } },
    });

    if (verification?.id) {
      await tx.verificationSession.update({ where: { id: verification.id }, data: { reservationId: created.id } });
    }
    await tx.reservationAuditLog.create({
      data: {
        reservationId: created.id,
        restaurantId,
        actorUserId: customerUserId,
        actorRole: "guest",
        action: paymentRequired ? "external_payment_required" : "booking_created",
        oldPaymentStatus: null,
        newPaymentStatus: created.paymentStatus,
        comment: paymentRequired ? "Гостю показана внешняя ссылка оплаты ресторана." : "Заявка создана без оплаты при бронировании.",
      },
    });
    await tx.notification.create({
      data: {
        userId: created.restaurant.ownerId,
        restaurantId,
        reservationId: created.id,
        type: "reservation_new",
        title: "Новая заявка на стол",
        message: `${created.customerName}, ${formatGuests(created.guestsCount)}, ${created.startTime}`,
      },
    });

    return created;
  });

  await refreshGuestStats(guest.id);
  if (reservation.verificationProvider && reservation.verifiedExternalChatId) {
    await sendMessengerMessage(
      reservation.verificationProvider,
      reservation.verifiedExternalChatId,
      `Kaifbook: заявка в ${reservation.restaurant.title} создана. Дата: ${reservation.reservationDate.toISOString().slice(0, 10)}, время: ${reservation.startTime}-${reservation.endTime}. Ресторан свяжется с вами для подтверждения.`,
    );
  }
  // Alert the restaurant's linked VK about the new booking.
  await notifyRestaurantReservationEvent({
    event: "new",
    restaurantTitle: reservation.restaurant.title,
    vkNotifyPeerId: reservation.restaurant.vkNotifyPeerId,
    customerName: input.customerName,
    customerPhone,
    guestsCount: input.guestsCount,
    reservationDate: validated.reservationDate,
    startTime: input.startTime,
    endTime: validated.endTime,
    tableNumber: null,
  });

  return {
    ...reservation,
    pricing: {
      ...publicPricing,
      isDepositRequired: paymentRequired,
      depositAmount: paymentAmount,
      explanation: paymentRequired ? reservation.pricingExplanation : "Оплата при бронировании не требуется.",
    },
    payment: paymentRequired ? { paymentUrl, amount: paymentAmount, status: EXTERNAL_PAYMENT_STATUSES.AWAITING_EXTERNAL_PAYMENT } : null,
    paymentTermsText: validated.restaurant.paymentTermsText || DEFAULT_EXTERNAL_PAYMENT_TERMS,
  };
}

async function getOrCreateGuest(input: { restaurantId: string; name: string; phone: string; email?: string | null }) {
  // Atomic upsert avoids a race where two concurrent reservations with the same
  // (restaurantId, phone) both pass a findUnique check and then both create,
  // hitting the unique constraint. Email is only overwritten when a new one is
  // provided (so an existing email is preserved on later bookings).
  return prisma.guest.upsert({
    where: { restaurantId_phone: { restaurantId: input.restaurantId, phone: input.phone } },
    update: { name: input.name, ...(input.email ? { email: input.email } : {}) },
    create: { restaurantId: input.restaurantId, name: input.name, phone: input.phone, email: input.email || null, tags: "[]" },
    select: { id: true },
  });
}

export async function refreshGuestStats(guestId: string) {
  const completedStatuses = [RESERVATION_STATUSES.COMPLETED, RESERVATION_STATUSES.SEATED];

  const [totals, completedAgg, noShowAgg, cancelledAgg, lastReservation, lastVisit] = await Promise.all([
    prisma.reservation.count({ where: { guestId } }),
    prisma.reservation.aggregate({ where: { guestId, status: { in: completedStatuses } }, _count: true, _sum: { guestsCount: true } }),
    prisma.reservation.count({ where: { guestId, status: RESERVATION_STATUSES.NO_SHOW } }),
    prisma.reservation.count({ where: { guestId, status: { in: CANCELLED_OR_REJECTED_STATUSES } } }),
    prisma.reservation.findFirst({ where: { guestId }, orderBy: { reservationDate: "desc" }, select: { reservationDate: true } }),
    prisma.reservation.findFirst({ where: { guestId, status: { in: completedStatuses } }, orderBy: { reservationDate: "desc" }, select: { reservationDate: true } }),
  ]);

  const reservationsCount = totals;
  const completedCount = completedAgg._count;
  const noShowCount = noShowAgg;
  const cancelledCount = cancelledAgg;
  const totalGuests = completedAgg._sum.guestsCount ?? 0;
  const noShowRate = reservationsCount ? Math.round((noShowCount / reservationsCount) * 100) : 0;
  const riskLevel = noShowCount > 0 || noShowRate >= 25 ? "high" : noShowRate >= 10 ? "medium" : "low";

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      reservationsCount,
      visitsCount: completedCount,
      completedVisitsCount: completedCount,
      noShowCount,
      noShowRate,
      cancelledCount,
      lastReservationAt: lastReservation?.reservationDate ?? null,
      lastVisitAt: lastVisit?.reservationDate ?? null,
      riskLevel,
      totalGuests,
    },
  });
}

async function getOrCreateCustomerUser(input: { fullName: string; phone: string; email?: string | null }) {
  // Only ever reuse a CUSTOMER account by phone — otherwise a guest booking with
  // the same phone as an owner/admin/staff member would be attributed to that
  // privileged account instead of a customer one.
  const existingByPhone = await prisma.user.findFirst({ where: { phone: input.phone, role: "customer" }, select: { id: true, fullName: true } });
  if (existingByPhone) {
    if (existingByPhone.fullName !== input.fullName) {
      await prisma.user.update({ where: { id: existingByPhone.id }, data: { fullName: input.fullName } });
    }
    return existingByPhone.id;
  }

  const email = phoneAccountEmail(input.phone);
  const existingByEmail = await prisma.user.findUnique({ where: { email }, select: { id: true, phone: true } });
  if (existingByEmail) {
    if (!existingByEmail.phone) await prisma.user.update({ where: { id: existingByEmail.id }, data: { phone: input.phone } });
    return existingByEmail.id;
  }

  const customer = await prisma.user.create({
    data: {
      email,
      fullName: input.fullName,
      phone: input.phone,
      passwordHash: await hashPassword(crypto.randomUUID()),
      role: "customer",
      isActive: true,
    },
    select: { id: true },
  });

  return customer.id;
}

export async function changeReservationStatus(
  reservationId: string,
  status: string,
  options: {
    rejectionReason?: string | null;
    cancellationReason?: string | null;
    noShowReason?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
    comment?: string | null;
  } = {},
) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { restaurant: { select: { title: true } } } });
  if (!reservation) throw new ApiError(404, "Заявка не найдена.");

  if (status === RESERVATION_STATUSES.CONFIRMED) {
    if (reservation.paymentRequired && reservation.paymentStatus !== EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT) {
      throw new ApiError(400, "Сначала отметьте оплату депозита.");
    }
    await validateReservationBusinessRules(
      reservation.restaurantId,
      {
        hallId: reservation.hallId,
        tableId: reservation.tableId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        guestsCount: reservation.guestsCount,
        reservationDate: reservation.reservationDate.toISOString().slice(0, 10),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        selectedSeatNumbers: reservation.selectedSeatNumbers,
        occasion: reservation.occasion,
        comment: reservation.comment,
      },
      { allowInactiveRestaurant: true, excludeReservationId: reservation.id },
    );
  }

  if (status === RESERVATION_STATUSES.SEATED && reservation.tableId) {
    const table = await prisma.restaurantTable.findUnique({ where: { id: reservation.tableId }, select: { isActive: true } });
    if (!table?.isActive) throw new ApiError(400, "Нельзя посадить гостей за неактивный стол");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status,
        confirmedAt: status === RESERVATION_STATUSES.CONFIRMED ? now : reservation.confirmedAt,
        confirmedByUserId: status === RESERVATION_STATUSES.CONFIRMED ? options.actorUserId || reservation.confirmedByUserId : reservation.confirmedByUserId,
        cancelledAt: CANCELLED_STATUSES.includes(status) ? now : reservation.cancelledAt,
        completedAt: status === RESERVATION_STATUSES.COMPLETED ? now : reservation.completedAt,
        rejectionReason: status === RESERVATION_STATUSES.REJECTED ? options.rejectionReason || null : reservation.rejectionReason,
        cancellationReason: status === RESERVATION_STATUSES.CANCELLED ? options.cancellationReason || null : reservation.cancellationReason,
        noShowReason: status === RESERVATION_STATUSES.NO_SHOW ? options.noShowReason || null : reservation.noShowReason,
        noShowRiskLevel: status === RESERVATION_STATUSES.NO_SHOW ? "high" : reservation.noShowRiskLevel,
        noShowRiskScore: status === RESERVATION_STATUSES.NO_SHOW ? 100 : reservation.noShowRiskScore,
      },
    });

    await tx.reservationAuditLog.create({
      data: {
        reservationId,
        restaurantId: reservation.restaurantId,
        actorUserId: options.actorUserId || null,
        actorRole: options.actorRole || "system",
        action: "status_changed",
        oldStatus: reservation.status,
        newStatus: status,
        oldPaymentStatus: reservation.paymentStatus,
        newPaymentStatus: reservation.paymentStatus,
        comment: options.comment || options.rejectionReason || options.cancellationReason || options.noShowReason || null,
      },
    });

    if (reservation.userId) {
      await tx.notification.create({
        data: {
          userId: reservation.userId,
          restaurantId: reservation.restaurantId,
          reservationId: reservation.id,
          type: `reservation_${status}`,
          title: "Статус заявки обновлён",
          message: `Заявка на ${reservation.startTime} получила статус ${status}`,
        },
      });
    }

    return result;
  });

  if (reservation.guestId) await refreshGuestStats(reservation.guestId);
  await notifyGuestReservationStatus({ ...reservation, restaurantTitle: reservation.restaurant.title }, status);

  return updated;
}

export async function markReservationPaymentPaid(reservationId: string, actor: { id: string; role: string }, comment?: string | null) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) throw new ApiError(404, "Заявка не найдена.");
  if (!reservation.paymentRequired) throw new ApiError(400, "Для этой заявки оплата не требуется.");
  if (reservation.paymentStatus === EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT) return reservation;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: EXTERNAL_PAYMENT_STATUSES.PAID_TO_RESTAURANT,
        paymentMarkedPaidByUserId: actor.id,
        paymentMarkedPaidAt: new Date(),
        paymentComment: comment || null,
        status: reservation.status === RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT ? RESERVATION_STATUSES.DEPOSIT_PAID : reservation.status,
        noShowRiskLevel: "low",
        noShowRiskScore: 5,
      },
    });

    await tx.reservationAuditLog.create({
      data: {
        reservationId,
        restaurantId: reservation.restaurantId,
        actorUserId: actor.id,
        actorRole: actor.role,
        action: "payment_marked_paid",
        oldStatus: reservation.status,
        newStatus: result.status,
        oldPaymentStatus: reservation.paymentStatus,
        newPaymentStatus: result.paymentStatus,
        comment: comment || "Оплата отмечена сотрудником ресторана.",
      },
    });

    return result;
  });

  if (reservation.verificationProvider && reservation.verifiedExternalChatId) {
    await sendMessengerMessage(reservation.verificationProvider, reservation.verifiedExternalChatId, "Kaifbook: ресторан отметил оплату депозита. Заявку скоро подтвердят.");
  }

  return updated;
}
