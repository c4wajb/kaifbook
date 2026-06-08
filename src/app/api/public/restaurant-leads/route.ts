import { handleApiError, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit, getClientIp, HOUR } from "@/lib/rate-limit";
import { restaurantLeadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRateLimit(
      [{ key: `lead:ip:${getClientIp(request)}`, rule: { limit: 5, windowMs: HOUR } }],
      "Слишком много заявок. Пожалуйста, попробуйте позже.",
    );
    const payload = restaurantLeadSchema.parse(await readJson(request));
    const lead = await prisma.restaurantLead.create({
      data: {
        restaurantName: payload.restaurantName,
        contactName: payload.contactName,
        phone: payload.phone,
        email: payload.email,
        city: payload.city,
        address: payload.address || null,
        comment: payload.comment || null,
      },
    });

    return ok(
      {
        lead,
        message: "Заявка отправлена",
        description:
          "Мы передали вашу заявку администратору Kaifbook. После проверки с вами свяжутся и создадут доступ к личному кабинету ресторана.",
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
