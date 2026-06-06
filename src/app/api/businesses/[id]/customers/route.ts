import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cleanOptional, customerSchema, zodError } from "@/lib/validation";

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

  const customers = await prisma.customer.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ customers });
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
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: cleanOptional(parsed.data.email || undefined),
      comment: cleanOptional(parsed.data.comment),
      source: cleanOptional(parsed.data.source) ?? "manual"
    }
  });

  return NextResponse.json({ customer }, { status: 201 });
}
