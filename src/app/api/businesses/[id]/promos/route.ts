import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cleanOptional, optionalDate, promoSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!business) {
    return jsonError("Бизнес не найден", 404);
  }

  const promos = await prisma.promo.findMany({
    where: { businessId: id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ promos });
}

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!business) {
    return jsonError("Бизнес не найден", 404);
  }

  const body = await readJson(request);
  const parsed = promoSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const promo = await prisma.promo.create({
    data: {
      businessId: id,
      title: parsed.data.title,
      description: parsed.data.description,
      discount: cleanOptional(parsed.data.discount),
      startDate: optionalDate(parsed.data.startDate),
      endDate: optionalDate(parsed.data.endDate),
      isActive: true
    }
  });

  return NextResponse.json({ promo }, { status: 201 });
}
