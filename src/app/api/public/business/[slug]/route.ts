import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      promos: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!business) {
    return jsonError("Бизнес не найден", 404);
  }

  return NextResponse.json({ business });
}
