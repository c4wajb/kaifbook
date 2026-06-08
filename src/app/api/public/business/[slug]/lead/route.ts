import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getClientIp, isRateLimited, HOUR, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { cleanOptional, leadSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: Params) {
  if (isRateLimited([{ key: `biz-lead:ip:${getClientIp(request)}`, rule: { limit: 5, windowMs: HOUR } }])) {
    return jsonError(RATE_LIMIT_MESSAGE, 429);
  }
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
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
      businessId: business.id,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      message: cleanOptional(parsed.data.message),
      source: "landing_page",
      status: "new"
    }
  });

  return NextResponse.json({ lead }, { status: 201 });
}
