import { ApiError, handleApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { RESTAURANT_STATUSES } from "@/lib/constants";
import { EXTERNAL_PAYMENT_DISCLAIMER } from "@/lib/external-payments";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { enforceRateLimit, getClientIp, HOUR } from "@/lib/rate-limit";
import { createReservation } from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";
import { getVerifiedVkUserId } from "@/lib/vk-mini-session";

type C = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: C) {
  try {
    const { slug } = await context.params;
    const restaurant = await prisma.restaurant.findFirst({
      where: { OR: [{ slug }, { id: slug }], isActive: true, status: RESTAURANT_STATUSES.APPROVED },
      select: { id: true },
    });
    if (!restaurant) throw new ApiError(404, "Ресторан не найден.");
    const payload = reservationSchema.parse(await readJson(request));
    const customerPhone = normalizePhone(payload.customerPhone);
    enforceRateLimit(
      [
        { key: `reservation:ip:${getClientIp(request)}`, rule: { limit: 12, windowMs: HOUR } },
        { key: `reservation:phone:${customerPhone}`, rule: { limit: 6, windowMs: HOUR } },
      ],
      "Слишком много заявок. Пожалуйста, попробуйте позже.",
    );
    const currentUser = await getCurrentUser();
    const sessionUserId =
      currentUser?.role === "customer" &&
      currentUser.phone &&
      normalizePhone(currentUser.phone) === normalizePhone(payload.customerPhone)
        ? currentUser.id
        : null;
    // VK Mini App bookings carry a signed session token; the trusted VK user id
    // becomes the peer for status notifications.
    const vkUserId =
      payload.source === "vk-mini-app" ? await getVerifiedVkUserId(request.headers.get("x-vk-mini-session")) : null;
    const reservation = await createReservation(restaurant.id, payload, sessionUserId, vkUserId);
    const message = reservation.payment
      ? "Заявка создана. Для подтверждения брони внесите депозит напрямую ресторану."
      : "Заявка на бронь отправлена. Ресторан свяжется с вами для подтверждения.";
    return ok({
      reservation,
      payment: reservation.payment,
      pricing: reservation.pricing,
      paymentTermsText: reservation.paymentTermsText,
      paymentDisclaimer: EXTERNAL_PAYMENT_DISCLAIMER,
      message,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
