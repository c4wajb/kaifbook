import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createUniqueBusinessSlug } from "@/lib/slug";
import { businessSchema, cleanOptional, zodError } from "@/lib/validation";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ businesses });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = await readJson(request);
  const parsed = businessSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const business = await prisma.business.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      slug: await createUniqueBusinessSlug(parsed.data.name, parsed.data.city),
      category: parsed.data.category,
      city: parsed.data.city,
      address: cleanOptional(parsed.data.address),
      phone: cleanOptional(parsed.data.phone),
      description: cleanOptional(parsed.data.description)
    }
  });

  return NextResponse.json({ business }, { status: 201 });
}
