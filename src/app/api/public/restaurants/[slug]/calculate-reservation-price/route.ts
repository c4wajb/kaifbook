import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applyExternalDepositToPricing } from "@/lib/external-payments";
import { calculateReservationPrice } from "@/lib/reservation-pricing";
import { dateFromInput, todayUtcMidnight } from "@/lib/time";
import { calculateReservationPriceSchema } from "@/lib/validation";

type C = { params: Promise<{ slug: string }> };

const DAY_MS = 24 * 60 * 60 * 1000;

function assertWithinMaxAdvance(reservationDate: Date, maxAdvanceBookingDays?: number | null) {
  const maxAdvanceDays = Math.max(1, Math.trunc(maxAdvanceBookingDays ?? 30));
  const maxReservationDate = new Date(todayUtcMidnight().getTime() + maxAdvanceDays * DAY_MS);
  if (reservationDate.getTime() > maxReservationDate.getTime()) {
    throw new ApiError(400, `Этот ресторан принимает брони максимум на ${maxAdvanceDays} дней вперед.`);
  }
}

export async function POST(request: Request, context: C) {
  try {
    const { slug } = await context.params;
    const restaurant = await prisma.restaurant.findFirst({ where: { OR: [{ id: slug }, { slug }], isActive: true }, include: { settings: true } });
    if (!restaurant) throw new ApiError(404, "Ресторан не найден.");
    const payload = calculateReservationPriceSchema.parse(await readJson(request));
    assertWithinMaxAdvance(dateFromInput(payload.reservationDate), restaurant.settings?.maxAdvanceBookingDays);
    const rawPricing = await calculateReservationPrice({ ...payload, restaurantId: restaurant.id });
    const pricing = applyExternalDepositToPricing(rawPricing, restaurant);
    return ok({ pricing });
  } catch (error) {
    return handleApiError(error);
  }
}
