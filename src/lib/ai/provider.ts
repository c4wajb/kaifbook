import type { Business, Promo } from "@prisma/client";
import { contentTypeLabels } from "@/lib/constants";

export type GenerateTextInput = {
  business: Pick<Business, "name" | "category" | "city" | "description">;
  type: string;
  tone: string;
  details: string;
  promo?: Pick<Promo, "title" | "description" | "discount"> | null;
};

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<string>;
}

export function buildMarketingPrompt(input: GenerateTextInput) {
  const promo = input.promo
    ? `${input.promo.title}: ${input.promo.description}${
        input.promo.discount ? `, выгода ${input.promo.discount}` : ""
      }`
    : "без отдельной акции";

  return `Ты маркетолог для локального бизнеса в городе ${input.business.city}. Напиши текст для ${
    contentTypeLabels[input.type as keyof typeof contentTypeLabels] ?? input.type
  } для бизнеса: ${input.business.name}. Категория: ${input.business.category}. Описание: ${
    input.business.description ?? "не указано"
  }. Акция: ${promo}. Тон: ${input.tone}. Дополнительные вводные: ${
    input.details
  }. Текст должен быть коротким, понятным и продающим.`;
}

class MockAIProvider implements AIProvider {
  async generateText(input: GenerateTextInput) {
    const typeLabel = contentTypeLabels[input.type as keyof typeof contentTypeLabels] ?? "контент";
    const promoLine = input.promo
      ? ` Сейчас действует акция "${input.promo.title}"${
          input.promo.discount ? ` (${input.promo.discount})` : ""
        }.`
      : "";

    if (input.type === "review_reply") {
      return `Спасибо за отзыв! Нам важно, что вы делитесь впечатлениями. Команда ${
        input.business.name
      } уже учла ваш комментарий: "${input.details}". Будем рады видеть вас снова в Курске.`;
    }

    return `${typeLabel} для ${input.business.name}\n\n${
      input.business.category
    } в Курске, куда удобно прийти за качественным сервисом без лишней суеты.${promoLine}\n\n${
      input.details
    }\n\nНапишите нам или позвоните, чтобы выбрать удобное время. Тон: ${input.tone}.`;
  }
}

export function getAIProvider(): AIProvider {
  return new MockAIProvider();
}
