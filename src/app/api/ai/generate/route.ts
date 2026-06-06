import { NextResponse } from "next/server";
import { jsonError, readJson, requireApiUser } from "@/lib/api";
import { buildMarketingPrompt, getAIProvider } from "@/lib/ai/provider";
import { prisma } from "@/lib/db";
import { aiGenerateSchema, zodError } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = await readJson(request);
  const parsed = aiGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(zodError(parsed.error));
  }

  const business = await prisma.business.findFirst({
    where: {
      id: parsed.data.businessId,
      userId: user.id
    }
  });

  if (!business) {
    return jsonError("Бизнес не найден", 404);
  }

  const activePromo = await prisma.promo.findFirst({
    where: {
      businessId: business.id,
      isActive: true
    },
    orderBy: { createdAt: "desc" }
  });

  const input = {
    business,
    type: parsed.data.type,
    tone: parsed.data.tone,
    details: parsed.data.details,
    promo: activePromo
  };
  const prompt = buildMarketingPrompt(input);
  const result = await getAIProvider().generateText(input);

  const content = await prisma.generatedContent.create({
    data: {
      businessId: business.id,
      type: parsed.data.type,
      prompt,
      result
    }
  });

  if (parsed.data.type === "review_reply") {
    await prisma.reviewReplyTemplate.create({
      data: {
        businessId: business.id,
        reviewText: parsed.data.details,
        tone: parsed.data.tone,
        generatedReply: result
      }
    });
  }

  return NextResponse.json({ content, result });
}
