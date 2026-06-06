"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aiGenerateSchema,
  businessSchema,
  cleanOptional,
  customerSchema,
  formToObject,
  leadSchema,
  leadStatusSchema,
  optionalDate,
  promoSchema,
  redirectPath,
  registerSchema,
  loginSchema,
  zodError
} from "@/lib/validation";
import {
  clearSessionCookie,
  hashPassword,
  requireOwnedBusiness,
  requireUser,
  setSessionCookie,
  verifyPassword
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUniqueBusinessSlug } from "@/lib/slug";
import { buildMarketingPrompt, getAIProvider } from "@/lib/ai/provider";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath("/register", "error", zodError(parsed.error)));
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true }
  });

  if (existing) {
    redirect(redirectPath("/register", "error", "Пользователь с таким email уже есть"));
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      passwordHash: await hashPassword(parsed.data.password),
      role: "owner"
    }
  });

  await setSessionCookie(user);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath("/login", "error", zodError(parsed.error)));
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    redirect(redirectPath("/login", "error", "Неверный email или пароль"));
  }

  await setSessionCookie(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createBusinessAction(formData: FormData) {
  const user = await requireUser();
  const parsed = businessSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath("/businesses/new", "error", zodError(parsed.error)));
  }

  const slug = await createUniqueBusinessSlug(parsed.data.name, parsed.data.city);
  const business = await prisma.business.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      slug,
      category: parsed.data.category,
      city: parsed.data.city,
      address: cleanOptional(parsed.data.address),
      phone: cleanOptional(parsed.data.phone),
      description: cleanOptional(parsed.data.description)
    }
  });

  revalidatePath("/businesses");
  redirect(redirectPath(`/businesses/${business.id}`, "success", "Бизнес создан"));
}

export async function updateBusinessAction(businessId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedBusiness(user.id, businessId);

  const parsed = businessSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    redirect(redirectPath(`/businesses/${businessId}/edit`, "error", zodError(parsed.error)));
  }

  const slug = await createUniqueBusinessSlug(parsed.data.name, parsed.data.city, businessId);
  await prisma.business.update({
    where: { id: businessId },
    data: {
      name: parsed.data.name,
      slug,
      category: parsed.data.category,
      city: parsed.data.city,
      address: cleanOptional(parsed.data.address),
      phone: cleanOptional(parsed.data.phone),
      description: cleanOptional(parsed.data.description)
    }
  });

  revalidatePath(`/businesses/${businessId}`);
  redirect(redirectPath(`/businesses/${businessId}`, "success", "Бизнес обновлен"));
}

export async function deleteBusinessAction(businessId: string) {
  const user = await requireUser();
  await requireOwnedBusiness(user.id, businessId);

  await prisma.business.delete({
    where: { id: businessId }
  });

  revalidatePath("/businesses");
  redirect(redirectPath("/businesses", "success", "Бизнес удален"));
}

export async function createCustomerAction(businessId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedBusiness(user.id, businessId);

  const parsed = customerSchema.safeParse(formToObject(formData));
  const target = `/businesses/${businessId}/customers`;

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.customer.create({
    data: {
      businessId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: cleanOptional(parsed.data.email || undefined),
      comment: cleanOptional(parsed.data.comment),
      source: cleanOptional(parsed.data.source) ?? "manual"
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Клиент добавлен"));
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const user = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { businessId: true }
  });

  if (!customer) {
    redirect(redirectPath("/businesses", "error", "Клиент не найден"));
  }

  const target = `/businesses/${customer.businessId}/customers`;
  const parsed = customerSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: cleanOptional(parsed.data.email || undefined),
      comment: cleanOptional(parsed.data.comment),
      source: cleanOptional(parsed.data.source) ?? "manual"
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Клиент обновлен"));
}

export async function deleteCustomerAction(customerId: string) {
  const user = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { businessId: true }
  });

  if (!customer) {
    redirect(redirectPath("/businesses", "error", "Клиент не найден"));
  }

  await prisma.customer.delete({
    where: { id: customerId }
  });

  const target = `/businesses/${customer.businessId}/customers`;
  revalidatePath(target);
  redirect(redirectPath(target, "success", "Клиент удален"));
}

export async function createLeadAction(businessId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedBusiness(user.id, businessId);

  const parsed = leadSchema.safeParse(formToObject(formData));
  const target = `/businesses/${businessId}/leads`;

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.lead.create({
    data: {
      businessId,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      message: cleanOptional(parsed.data.message),
      source: cleanOptional(parsed.data.source) ?? "manual",
      status: "new"
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Заявка добавлена"));
}

export async function updateLeadStatusAction(leadId: string, formData: FormData) {
  const user = await requireUser();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, business: { userId: user.id } },
    select: { businessId: true }
  });

  if (!lead) {
    redirect(redirectPath("/businesses", "error", "Заявка не найдена"));
  }

  const target = `/businesses/${lead.businessId}/leads`;
  const parsed = leadStatusSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: parsed.data.status }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Статус заявки обновлен"));
}

export async function createPromoAction(businessId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedBusiness(user.id, businessId);

  const parsed = promoSchema.safeParse(formToObject(formData));
  const target = `/businesses/${businessId}/promos`;

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.promo.create({
    data: {
      businessId,
      title: parsed.data.title,
      description: parsed.data.description,
      discount: cleanOptional(parsed.data.discount),
      startDate: optionalDate(parsed.data.startDate),
      endDate: optionalDate(parsed.data.endDate),
      isActive: true
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Акция создана"));
}

export async function updatePromoAction(promoId: string, formData: FormData) {
  const user = await requireUser();
  const promo = await prisma.promo.findFirst({
    where: { id: promoId, business: { userId: user.id } },
    select: { businessId: true }
  });

  if (!promo) {
    redirect(redirectPath("/businesses", "error", "Акция не найдена"));
  }

  const target = `/businesses/${promo.businessId}/promos`;
  const parsed = promoSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.promo.update({
    where: { id: promoId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discount: cleanOptional(parsed.data.discount),
      startDate: optionalDate(parsed.data.startDate),
      endDate: optionalDate(parsed.data.endDate),
      isActive: formData.get("isActive") === "on"
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Акция обновлена"));
}

export async function deactivatePromoAction(promoId: string) {
  const user = await requireUser();
  const promo = await prisma.promo.findFirst({
    where: { id: promoId, business: { userId: user.id } },
    select: { businessId: true }
  });

  if (!promo) {
    redirect(redirectPath("/businesses", "error", "Акция не найдена"));
  }

  await prisma.promo.update({
    where: { id: promoId },
    data: { isActive: false }
  });

  const target = `/businesses/${promo.businessId}/promos`;
  revalidatePath(target);
  redirect(redirectPath(target, "success", "Акция отключена"));
}

export async function generateContentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = aiGenerateSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    redirect(redirectPath("/dashboard", "error", zodError(parsed.error)));
  }

  const business = await requireOwnedBusiness(user.id, parsed.data.businessId);
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

  const target = `/businesses/${business.id}/ai-content`;
  revalidatePath(target);
  redirect(`${target}?generated=${content.id}`);
}

export async function publicLeadAction(slug: string, formData: FormData) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true }
  });

  if (!business) {
    redirect("/b");
  }

  const parsed = leadSchema.safeParse(formToObject(formData));
  const target = `/b/${slug}`;

  if (!parsed.success) {
    redirect(redirectPath(target, "error", zodError(parsed.error)));
  }

  await prisma.lead.create({
    data: {
      businessId: business.id,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      message: cleanOptional(parsed.data.message),
      source: "landing_page",
      status: "new"
    }
  });

  revalidatePath(target);
  redirect(redirectPath(target, "success", "Заявка отправлена. С вами свяжутся"));
}
