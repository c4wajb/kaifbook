import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cleanOptional, customerSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id, business: { userId: user.id } },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Клиент не найден", 404);
  }

  const body = await readJson(request);
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: cleanOptional(parsed.data.email || undefined),
      comment: cleanOptional(parsed.data.comment),
      source: cleanOptional(parsed.data.source) ?? "manual"
    }
  });

  return NextResponse.json({ customer });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id, business: { userId: user.id } },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Клиент не найден", 404);
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
