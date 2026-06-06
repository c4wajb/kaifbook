import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { leadStatusSchema, zodError } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.lead.findFirst({
    where: { id, business: { userId: user.id } },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("Заявка не найдена", 404);
  }

  const body = await readJson(request);
  const parsed = leadStatusSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: parsed.data.status }
  });

  return NextResponse.json({ lead });
}
