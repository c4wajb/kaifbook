import { ApiError, handleApiError, ok } from "@/lib/api";
import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { applyExternalDepositToPricing } from "@/lib/external-payments";
import { expireOverdueDepositPayments } from "@/lib/payments";
import { calculateReservationPrice } from "@/lib/reservation-pricing";
import { addMinutesToTime, dateFromInput, dayOfWeekFromDate, isRangeWithinWorkingHours, normalizedEndMinutes, slotRangesOverlap, timeToMinutes, todayUtcMidnight } from "@/lib/time";

type C = { params: Promise<{ slug: string }> };

const OCCUPYING_STATUSES = [
  RESERVATION_STATUSES.NEW,
  RESERVATION_STATUSES.AWAITING_RESTAURANT_CONFIRMATION,
  RESERVATION_STATUSES.CONFIRMED_BY_RESTAURANT,
  RESERVATION_STATUSES.AWAITING_DEPOSIT_PAYMENT,
  RESERVATION_STATUSES.DEPOSIT_PAID,
  RESERVATION_STATUSES.CONFIRMED_BY_GUEST,
  RESERVATION_STATUSES.CONFIRMED,
  RESERVATION_STATUSES.SEATED,
] as string[];

const DAY_MS = 24 * 60 * 60 * 1000;

function assertWithinMaxAdvance(reservationDate: Date, maxAdvanceBookingDays?: number | null) {
  const maxAdvanceDays = Math.max(1, Math.trunc(maxAdvanceBookingDays ?? 30));
  const maxReservationDate = new Date(todayUtcMidnight().getTime() + maxAdvanceDays * DAY_MS);
  if (reservationDate.getTime() > maxReservationDate.getTime()) {
    throw new ApiError(400, `Этот ресторан принимает брони максимум на ${maxAdvanceDays} дней вперед.`);
  }
}

function generatedSeats(tableId: string, seatsCount: number, tableStatus: string) {
  const status = tableStatus === "available" ? "available" : tableStatus === "occupied" ? "occupied" : "unavailable";
  return Array.from({ length: Math.max(0, seatsCount) }, (_, index) => ({
    id: `${tableId}:seat-${index + 1}`,
    seatNumber: index + 1,
    status,
  }));
}

export async function GET(request: Request, context: C) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const reservationDate = searchParams.get("date") || "";
    const startTime = searchParams.get("time") || "";
    const guestsCount = Number(searchParams.get("guestsCount") || 1);
    if (!reservationDate || !startTime || !Number.isFinite(guestsCount) || guestsCount < 1) {
      throw new ApiError(400, "Проверьте дату, время и количество гостей.");
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { OR: [{ id: slug }, { slug }], isActive: true },
      include: {
        settings: true,
        workingHours: true,
        halls: {
          where: { isActive: true },
          include: {
            tables: { include: { tableType: true }, orderBy: { number: "asc" } },
            objects: { orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }] },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!restaurant) throw new ApiError(404, "Ресторан не найден.");

    await expireOverdueDepositPayments(restaurant.id);
    const date = dateFromInput(reservationDate);
    assertWithinMaxAdvance(date, restaurant.settings?.maxAdvanceBookingDays);
    const endTime = searchParams.get("endTime") || addMinutesToTime(startTime, restaurant.settings?.reservationDurationMinutes ?? 120);
    const startMinutes = timeToMinutes(startTime);
    const rawEndMinutes = timeToMinutes(endTime);
    if (startMinutes === rawEndMinutes) throw new ApiError(400, "Время окончания должно быть позже времени начала.");
    const endMinutes = normalizedEndMinutes(startMinutes, rawEndMinutes);
    if (endMinutes - startMinutes < 60) throw new ApiError(400, "Минимальная длительность бронирования - 1 час.");

    const workingHour = restaurant.workingHours.find((item) => item.dayOfWeek === dayOfWeekFromDate(date)) ?? null;
    if (!isRangeWithinWorkingHours(startTime, endTime, workingHour)) {
      throw new ApiError(400, "Выбранное время недоступно. Выберите время в рамках работы ресторана.");
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId: restaurant.id,
        reservationDate: date,
        tableId: { not: null },
        status: { in: OCCUPYING_STATUSES },
      },
      select: { tableId: true, startTime: true, endTime: true, status: true },
    });

    const flatTables = restaurant.halls.flatMap((hall) => hall.tables.map((table) => ({ ...table, hallId: hall.id, hallTitle: hall.title })));
    const tables = await Promise.all(
      flatTables.map(async (table) => {
        const conflict = reservations.find((reservation) => reservation.tableId === table.id && slotRangesOverlap(startTime, endTime, reservation.startTime, reservation.endTime, workingHour));
        const maxGuests = table.maxGuests ?? table.seats;
        const minGuests = table.minGuests ?? table.tableType?.minGuests ?? 1;
        const tooSmall = guestsCount > maxGuests;
        const belowMin = guestsCount < minGuests;
        const status = !table.isActive ? "disabled" : conflict ? "occupied" : tooSmall ? "too_small" : "available";
        const rawPricing = await calculateReservationPrice({
          restaurantId: restaurant.id,
          tableId: table.id,
          tableTypeId: table.tableTypeId,
          guestsCount,
          reservationDate,
          startTime,
          endTime,
        });
        const pricing = applyExternalDepositToPricing(rawPricing, restaurant);

        return {
          id: table.id,
          hallId: table.hallId,
          hallTitle: table.hallTitle,
          number: table.number,
          seats: table.seats,
          shape: table.shape,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          isActive: table.isActive,
          minGuests,
          maxGuests,
          tableType: table.tableType ? { id: table.tableType.id, title: table.tableType.title, code: table.tableType.code } : null,
          status,
          reason: conflict
            ? "На это время стол уже занят"
            : tooSmall
              ? "За этим столом не хватит мест"
              : belowMin
                ? `Этот стол подходит для компании от ${minGuests} человек. Количество гостей обновится после выбора.`
                : "Стол доступен",
          pricing: {
            bookingPrice: pricing.bookingPrice,
            depositAmount: pricing.depositAmount,
            isDepositRequired: pricing.isDepositRequired,
            appliedRuleId: pricing.appliedRuleId,
            explanation: pricing.explanation,
            noShowRiskLevel: pricing.noShowRiskLevel,
          },
          seatsMap: generatedSeats(table.id, table.seats, status),
        };
      }),
    );

    return ok({
      restaurantId: restaurant.id,
      date: reservationDate,
      startTime,
      endTime,
      settings: {
        allowTableSelection: restaurant.settings?.allowTableSelection ?? true,
        allowSeatSelection: restaurant.settings?.allowSeatSelection ?? true,
        reserveWholeTableWhenSeatsSelected: restaurant.settings?.reserveWholeTableWhenSeatsSelected ?? true,
        minSeatsSelection: restaurant.settings?.minSeatsSelection ?? 1,
        maxSeatsSelection: restaurant.settings?.maxSeatsSelection ?? null,
      },
      halls: restaurant.halls.map((hall) => ({
        id: hall.id,
        title: hall.title,
        width: hall.width,
        height: hall.height,
        sortOrder: hall.sortOrder,
        objects: hall.objects.map((object) => ({
          id: object.id,
          type: object.type,
          label: object.label,
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          rotation: object.rotation,
          shape: object.shape,
          icon: object.icon,
          color: object.color,
          zIndex: object.zIndex,
          isVisible: object.isVisible,
        })),
      })),
      tables,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
