import { RESERVATION_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";

const ACTIVE_VISIT_STATUSES = [RESERVATION_STATUSES.CONFIRMED, RESERVATION_STATUSES.SEATED, RESERVATION_STATUSES.COMPLETED] as const;
const LOST_STATUSES = [
  RESERVATION_STATUSES.CANCELLED,
  RESERVATION_STATUSES.CANCELLED_BY_GUEST,
  RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
  RESERVATION_STATUSES.REJECTED,
  RESERVATION_STATUSES.NO_SHOW,
] as const;

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

function weekdayLabel(day: number) {
  return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][day] ?? "День";
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getRestaurantAnalytics(restaurantId: string) {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const last7 = addDays(today, -6);
  const last14 = addDays(today, -13);
  const last30 = addDays(today, -29);

  const [restaurant, reservations, repeatGuests, newGuests, activeTables, pageEvents, storedRecommendations] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { settings: true } }),
    prisma.reservation.findMany({ where: { restaurantId, reservationDate: { gte: last30 } }, orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }] }),
    prisma.guest.count({ where: { restaurantId, reservationsCount: { gt: 1 } } }),
    // Truly new guests: created in the window AND with only one reservation so
    // far, so newGuests and repeatGuests stay mutually exclusive.
    prisma.guest.count({ where: { restaurantId, createdAt: { gte: last30 }, reservationsCount: { lte: 1 } } }),
    prisma.restaurantTable.findMany({ where: { restaurantId, isActive: true }, select: { seats: true } }),
    prisma.restaurantPageEvent.findMany({ where: { restaurantId, createdAt: { gte: last30 } }, select: { type: true, source: true, createdAt: true } }),
    prisma.recommendation.findMany({ where: { restaurantId, isRead: false }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 8 }),
  ]);

  const todayReservations = reservations.filter((reservation) => reservation.reservationDate >= today && reservation.reservationDate < tomorrow);
  const weekReservations = reservations.filter((reservation) => reservation.reservationDate >= last7);
  const twoWeekReservations = reservations.filter((reservation) => reservation.reservationDate >= last14);
  const confirmedLike = reservations.filter((reservation) => ACTIVE_VISIT_STATUSES.includes(reservation.status as (typeof ACTIVE_VISIT_STATUSES)[number]));
  const totalRequests = reservations.length;
  const confirmedCount = confirmedLike.length;
  const noShowCount = reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.NO_SHOW).length;
  const cancelledCount = reservations.filter((reservation) => LOST_STATUSES.includes(reservation.status as (typeof LOST_STATUSES)[number])).length;
  const expectedGuestsToday = todayReservations.filter((reservation) => ACTIVE_VISIT_STATUSES.includes(reservation.status as (typeof ACTIVE_VISIT_STATUSES)[number])).reduce((sum, reservation) => sum + reservation.guestsCount, 0);
  const activeSeats = activeTables.reduce((sum, table) => sum + table.seats, 0);
  const pageViews = pageEvents.filter((event) => event.type === "view").length;
  const bookingClicks = pageEvents.filter((event) => event.type === "booking_click").length;

  const sourceCounts = countBy(reservations.map((reservation) => reservation.source || "site"));
  const busyHourCounts = countBy(confirmedLike.map((reservation) => reservation.startTime.slice(0, 2) + ":00"));
  const popularSlots = Object.entries(busyHourCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slot, count]) => ({ slot, count }));
  const busiestSlot = popularSlots[0]?.slot ?? "пока нет данных";

  const days = Array.from({ length: 14 }, (_, index) => addDays(last14, index));
  const reservationsByDay = days.map((day) => {
    const key = dateKey(day);
    const dayReservations = reservations.filter((reservation) => dateKey(reservation.reservationDate) === key);
    return {
      key,
      label: dayLabel(day),
      reservations: dayReservations.length,
      guests: dayReservations.filter((reservation) => ACTIVE_VISIT_STATUSES.includes(reservation.status as (typeof ACTIVE_VISIT_STATUSES)[number])).reduce((sum, reservation) => sum + reservation.guestsCount, 0),
    };
  });

  const weekdayLoad = Array.from({ length: 7 }, (_, day) => {
    const dayReservations = twoWeekReservations.filter((reservation) => reservation.reservationDate.getDay() === day && ACTIVE_VISIT_STATUSES.includes(reservation.status as (typeof ACTIVE_VISIT_STATUSES)[number]));
    return { label: weekdayLabel(day), guests: dayReservations.reduce((sum, reservation) => sum + reservation.guestsCount, 0), reservations: dayReservations.length };
  });

  const bestDay = [...weekdayLoad].sort((a, b) => b.guests - a.guests)[0];
  const weakDay = [...weekdayLoad].filter((item) => item.guests > 0).sort((a, b) => a.guests - b.guests)[0] ?? weekdayLoad[1];
  const averagePartySize = confirmedLike.length ? Math.round((confirmedLike.reduce((sum, reservation) => sum + reservation.guestsCount, 0) / confirmedLike.length) * 10) / 10 : 0;
  const repeatGuestsCount = repeatGuests;
  const newGuestsCount = newGuests;

  const computedRecommendations = buildRecommendations({
    restaurant,
    totalRequests,
    confirmedCount,
    noShowRate: percent(noShowCount, totalRequests),
    conversionRate: percent(confirmedCount, totalRequests),
    weakDay: weakDay?.label,
    popularSlot: busiestSlot,
    pageViews,
    bookingClicks,
  });

  return {
    restaurant,
    metrics: {
      reservationsToday: todayReservations.length,
      newRequests: reservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.NEW).length,
      confirmedToday: todayReservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.CONFIRMED || reservation.status === RESERVATION_STATUSES.SEATED).length,
      cancelledToday: todayReservations.filter((reservation) => reservation.status === RESERVATION_STATUSES.CANCELLED || reservation.status === RESERVATION_STATUSES.REJECTED).length,
      guestsToday: expectedGuestsToday,
      expectedSeatingToday: expectedGuestsToday,
      occupancyPercent: percent(expectedGuestsToday, activeSeats),
      busyHours: popularSlots,
      weekGuests: weekReservations.filter((reservation) => ACTIVE_VISIT_STATUSES.includes(reservation.status as (typeof ACTIVE_VISIT_STATUSES)[number])).reduce((sum, reservation) => sum + reservation.guestsCount, 0),
      monthGuests: confirmedLike.reduce((sum, reservation) => sum + reservation.guestsCount, 0),
      conversionRate: percent(confirmedCount, totalRequests),
      noShowRate: percent(noShowCount, totalRequests),
      cancelledRate: percent(cancelledCount, totalRequests),
      repeatGuests: repeatGuestsCount,
      newGuests: newGuestsCount,
      activePromotions: 0,
      pageViews,
      bookingClicks,
      viewToBookingRate: percent(totalRequests, pageViews),
      totalRequests,
      averagePartySize,
      bestDay: bestDay?.label ?? "пока нет данных",
      weakDay: weakDay?.label ?? "пока нет данных",
      busiestSlot,
    },
    charts: { reservationsByDay, weekdayLoad, popularSlots, sources: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })) },
    recommendations: [
      ...storedRecommendations.map((item) => ({ id: item.id, type: item.type, title: item.title, description: item.description, priority: item.priority, source: "stored" as const })),
      ...computedRecommendations,
    ].slice(0, 10),
  };
}

function buildRecommendations(input: { restaurant: { description: string; mainPhotoUrl: string | null; galleryPhotos: string } | null; totalRequests: number; confirmedCount: number; noShowRate: number; conversionRate: number; weakDay?: string; popularSlot: string; pageViews: number; bookingClicks: number }) {
  const recommendations: Array<{ id: string; type: string; title: string; description: string; priority: number; source: "computed" }> = [];
  if (!input.restaurant?.mainPhotoUrl || input.restaurant.galleryPhotos === "[]") {
    recommendations.push({ id: "missing_photos", type: "missing_photos", title: "Добавьте больше фотографий", description: "Страницы с живыми фото вызывают больше доверия и лучше конвертируют просмотры в заявки.", priority: 3, source: "computed" });
  }
  if ((input.restaurant?.description.length ?? 0) < 220) {
    recommendations.push({ id: "incomplete_profile", type: "incomplete_profile", title: "Усилите описание ресторана", description: "Гостю проще решиться на бронь, когда понятен формат, кухня, атмосфера и повод для визита.", priority: 2, source: "computed" });
  }
  if (input.totalRequests > 5 && input.noShowRate >= 15) {
    recommendations.push({ id: "high_no_show", type: "high_no_show", title: "Снизьте неявки", description: "Процент no-show выше комфортного уровня. Поможет напоминание за 2 часа и уточнение визита менеджером.", priority: 3, source: "computed" });
  }
  if (input.totalRequests > 5 && input.conversionRate < 60) {
    recommendations.push({ id: "low_conversion", type: "low_conversion", title: "Ускорьте подтверждение заявок", description: "Часть заявок не доходит до подтверждения. Чем быстрее менеджер отвечает, тем меньше гостей уходит к конкурентам.", priority: 3, source: "computed" });
  }
  if (input.weakDay) {
    recommendations.push({ id: "low_occupancy_day", type: "low_occupancy_day", title: `Усилить ${input.weakDay}`, description: `В этот день загрузка ниже остальных. Попробуйте специальное предложение, сет-меню или кампанию в соцсетях.`, priority: 2, source: "computed" });
  }
  if (input.popularSlot !== "пока нет данных") {
    recommendations.push({ id: "popular_time_slot", type: "popular_time_slot", title: `Пик спроса около ${input.popularSlot}`, description: "В это время стоит заранее распределять столы и подтверждать заявки без задержек.", priority: 1, source: "computed" });
  }
  if (input.pageViews > 20 && input.bookingClicks < Math.max(3, input.pageViews * 0.08)) {
    recommendations.push({ id: "low_booking_clicks", type: "low_conversion", title: "Усилить CTA на странице", description: "Просмотры есть, но кликов по бронированию мало. Добавьте больше фото и разместите ссылку брони в соцсетях.", priority: 2, source: "computed" });
  }
  return recommendations;
}
