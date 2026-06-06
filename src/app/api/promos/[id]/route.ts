import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cleanOptional, optionalDate, promoSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.promo.findFirst({
    where: { id, business: { userId: user.id } },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Акция не найдена", 404);
  }

  const body = await readJson(request);
  const parsed = promoSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const promo = await prisma.promo.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discount: cleanOptional(parsed.data.discount),
      startDate: optionalDate(parsed.data.startDate),
      endDate: optionalDate(parsed.data.endDate),
      isActive: typeof body?.isActive === "boolean" ? body.isActive : true
    }
  });

  return NextResponse.json({ promo });
}
