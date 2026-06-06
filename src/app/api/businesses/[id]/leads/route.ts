import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cleanOptional, leadSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
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

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const leads = await prisma.lead.findMany({
    where: {
      businessId: id,
      ...(status ? { status } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ leads });
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
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const lead = await prisma.lead.create({
    data: {
      businessId: id,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      message: cleanOptional(parsed.data.message),
      source: cleanOptional(parsed.data.source) ?? "manual",
      status: "new"
    }
  });

  return NextResponse.json({ lead }, { status: 201 });
}
