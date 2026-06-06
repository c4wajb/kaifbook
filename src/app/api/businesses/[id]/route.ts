import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createUniqueBusinessSlug } from "@/lib/slug";
import { businessSchema, cleanOptional, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: {
        select: {
          customers: true,
          leads: true,
          promos: true,
          generatedContents: true
        }
      }
    }
  });

  if (!business) {
    return jsonError("Бизнес не найден", 404);
  }

  return NextResponse.json({ business });
}

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.business.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Бизнес не найден", 404);
  }

  const body = await readJson(request);
  const parsed = businessSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const business = await prisma.business.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: await createUniqueBusinessSlug(parsed.data.name, parsed.data.city, id),
      category: parsed.data.category,
      city: parsed.data.city,
      address: cleanOptional(parsed.data.address),
      phone: cleanOptional(parsed.data.phone),
      description: cleanOptional(parsed.data.description)
    }
  });

  return NextResponse.json({ business });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.business.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Бизнес не найден", 404);
  }

  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
