import { z } from "zod";
import { contentTones, contentTypes, leadStatuses, PAYMENT_MODES, ROLES, TABLE_SHAPES } from "@/lib/constants";
import { isSafeExternalPaymentUrl } from "@/lib/external-payments";
import { isAllowedImageHostUrl } from "@/lib/image-hosts";
import { isValidRuPhone, normalizePhone } from "@/lib/phone";

export const registerSchema = z.object({
  email: z.string().trim().email("Введите корректный email").toLowerCase(),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
  fullName: z.string().trim().min(2, "Введите имя"),
  phone: z.string().trim().min(5, "Введите телефон"),
  role: z.enum([ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_MANAGER, ROLES.CUSTOMER]).default(ROLES.CUSTOMER),
});
export const loginSchema = z.object({ email: z.string().trim().email("Введите корректный email").toLowerCase(), password: z.string().min(1, "Введите пароль") });
export const businessSchema = z.object({ name: z.string().trim().min(2), category: z.string().trim().min(2), city: z.string().trim().min(2).default("Курск"), address: z.string().trim().optional(), phone: z.string().trim().optional(), description: z.string().trim().optional() });
export const customerSchema = z.object({ name: z.string().trim().min(2), phone: z.string().trim().min(5), email: z.string().trim().email().optional().or(z.literal("")), comment: z.string().trim().optional(), source: z.string().trim().optional() });
export const leadSchema = z.object({ customerName: z.string().trim().min(2), phone: z.string().trim().min(5), message: z.string().trim().optional(), source: z.string().trim().optional() });
export const leadStatusSchema = z.object({ status: z.enum(leadStatuses) });
export const promoSchema = z.object({ title: z.string().trim().min(2), description: z.string().trim().min(5), discount: z.string().trim().optional(), startDate: z.string().trim().optional(), endDate: z.string().trim().optional(), isActive: z.coerce.boolean().optional() });
export const aiGenerateSchema = z.object({ businessId: z.string().min(1), type: z.enum(contentTypes), tone: z.enum(contentTones as [string, ...string[]]), details: z.string().trim().min(3) });

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const internalUploadPathPattern =
  /^\/uploads\/restaurants\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|avif)$/i;

function isAllowedImageSource(value: string) {
  if (!value) return true;
  if (internalUploadPathPattern.test(value)) return true;
  // Absolute URLs must be https on a host whitelisted in next.config.ts
  // (built from the same list) — anything else breaks at /_next/image.
  return isAllowedImageHostUrl(value);
}

const imageSourceSchema = z
  .string()
  .trim()
  .refine(isAllowedImageSource, "Укажите корректную ссылку на изображение или загрузите файл.")
  .optional()
  .nullable();

export const restaurantSchema = z.object({
  title: z.string().trim().min(2),
  slug: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(10),
  shortDescription: z.string().trim().min(5),
  city: z.string().trim().min(2),
  address: z.string().trim().min(3),
  phone: z.string().trim().min(3),
  email: z.string().trim().email(),
  website: z.string().trim().url().optional().or(z.literal("")).nullable(),
  averageCheck: z.coerce.number().int().positive(),
  cuisineTypes: z.union([z.array(z.string()), z.string()]).optional(),
  features: z.union([z.array(z.string()), z.string()]).optional(),
  mainPhotoUrl: imageSourceSchema,
  galleryPhotos: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
export const workingHourSchema = z.object({ dayOfWeek: z.coerce.number().int().min(0).max(6), openTime: timeSchema, closeTime: timeSchema, isClosed: z.coerce.boolean().default(false) });
export const workingHoursSchema = z.object({ workingHours: z.array(workingHourSchema).length(7) });
export const menuCategorySchema = z.object({ title: z.string().trim().min(2), sortOrder: z.coerce.number().int().default(0), isActive: z.coerce.boolean().default(true) });
const menuItemWeightSchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d+)?\s?(г|кг|мл|л|шт|порция)$/i, "Укажите вес числом и единицей измерения.")
  .optional()
  .or(z.literal(""))
  .nullable();
export const menuItemSchema = z.object({ categoryId: z.string().optional().nullable(), title: z.string().trim().min(2), description: z.string().trim().default(""), price: z.coerce.number().int().nonnegative(), weight: menuItemWeightSchema, photoUrl: imageSourceSchema, isAvailable: z.coerce.boolean().default(true), sortOrder: z.coerce.number().int().default(0) });
export const hallSchema = z.object({ title: z.string().trim().min(2), width: z.coerce.number().int().min(320).max(2400).default(900), height: z.coerce.number().int().min(240).max(1600).default(520), sortOrder: z.coerce.number().int().default(0), isActive: z.coerce.boolean().default(true) });
export const tableSchema = z.object({ number: z.string().trim().min(1), seats: z.coerce.number().int().positive(), tableTypeId: z.string().optional().nullable(), bookingPrice: z.coerce.number().int().nonnegative().optional().nullable(), depositAmount: z.coerce.number().int().nonnegative().optional().nullable(), depositRequired: z.coerce.boolean().optional().nullable(), minGuests: z.coerce.number().int().positive().optional().nullable(), maxGuests: z.coerce.number().int().positive().optional().nullable(), shape: z.enum(TABLE_SHAPES).default("rectangle"), x: z.coerce.number().int().min(0).default(40), y: z.coerce.number().int().min(0).default(40), width: z.coerce.number().int().min(36).max(480).default(96), height: z.coerce.number().int().min(36).max(480).default(64), rotation: z.coerce.number().int().default(0), isActive: z.coerce.boolean().default(true) });
export const hallObjectSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["bar", "toilet", "entrance", "exit", "stage", "wall", "partition", "column", "kitchen", "wardrobe", "dancefloor", "sofa", "window", "zone", "custom"]).default("custom"),
  label: z.string().trim().min(1),
  x: z.coerce.number().int().min(0).default(40),
  y: z.coerce.number().int().min(0).default(40),
  width: z.coerce.number().int().min(8).max(1200).default(120),
  height: z.coerce.number().int().min(8).max(1200).default(64),
  rotation: z.coerce.number().int().default(0),
  shape: z.enum(["rectangle", "square", "circle", "oval", "line"]).default("rectangle"),
  icon: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  zIndex: z.coerce.number().int().default(0),
  isLocked: z.coerce.boolean().default(false),
  isVisible: z.coerce.boolean().default(true),
  notes: z.string().trim().optional().nullable(),
});
export const hallLayoutSchema = z.object({ hall: hallSchema.partial().optional(), tables: z.array(tableSchema.extend({ id: z.string().optional() })), objects: z.array(hallObjectSchema).optional().default([]) });
export const reservationSchema = z.object({
  hallId: z.string().optional().nullable(),
  tableId: z.string().optional().nullable(),
  selectedSeatNumbers: z.union([z.array(z.union([z.string(), z.number()])), z.string()]).optional().nullable(),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().refine(isValidRuPhone, "Введите корректный номер телефона.").transform(normalizePhone),
  customerEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  guestsCount: z.coerce.number().int().positive(),
  reservationDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema.optional().nullable(),
  verificationSessionId: z.string().trim().optional().nullable(),
  source: z.enum(["web", "vk-mini-app"]).optional(),
  occasion: z.string().trim().optional().nullable(),
  comment: z.string().trim().optional().nullable(),
});
export const rejectReservationSchema = z.object({ rejectionReason: z.string().trim().optional().nullable() });
export const adminRestaurantStatusSchema = z.object({
  status: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  bannerTitle: z.string().trim().optional().nullable(),
  bannerSubtitle: z.string().trim().optional().nullable(),
  bannerImage: imageSourceSchema,
  bannerSortOrder: z.coerce.number().int().optional(),
});
export const restaurantLeadSchema = z.object({
  restaurantName: z.string().trim().min(2, "Введите название ресторана"),
  contactName: z.string().trim().min(2, "Введите имя контактного лица"),
  phone: z.string().trim().min(5, "Введите телефон"),
  email: z.string().trim().email("Введите корректный email"),
  city: z.string().trim().min(2, "Введите город"),
  address: z.string().trim().optional().nullable(),
  comment: z.string().trim().optional().nullable(),
});
export const restaurantApplicationStatusSchema = z.object({
  status: z.enum(["new", "in_review", "approved", "rejected"]),
  adminComment: z.string().trim().optional().nullable(),
});
export const restaurantApplicationApproveSchema = z.object({
  restaurantName: z.string().trim().min(2, "Введите название ресторана"),
  ownerName: z.string().trim().min(2, "Введите имя владельца"),
  ownerEmail: z.string().trim().email("Введите корректный email").toLowerCase(),
  ownerPhone: z.string().trim().min(5, "Введите телефон"),
  temporaryPassword: z.string().min(6, "Пароль должен быть не короче 6 символов"),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().min(2, "Введите город"),
  adminComment: z.string().trim().optional().nullable(),
});
export const restaurantApplicationRejectSchema = z.object({
  reason: z.string().trim().optional().nullable(),
});
export const reservationSettingsSchema = z.object({
  minGuests: z.coerce.number().int().min(1).default(1),
  maxGuests: z.coerce.number().int().min(1).max(200).default(12),
  reservationDurationMinutes: z.coerce.number().int().min(30).max(480).default(120),
  minAdvanceBookingMinutes: z.coerce.number().int().min(0).max(10080).default(60),
  maxAdvanceBookingDays: z.coerce.number().int().min(1).max(365).default(30),
  autoConfirmEnabled: z.coerce.boolean().default(false),
  allowTableSelection: z.coerce.boolean().default(true),
  allowSeatSelection: z.coerce.boolean().default(true),
  reserveWholeTableWhenSeatsSelected: z.coerce.boolean().default(true),
  minSeatsSelection: z.coerce.number().int().min(0).max(200).default(1),
  maxSeatsSelection: z.coerce.number().int().min(1).max(200).optional().nullable(),
  requirePhoneConfirmation: z.coerce.boolean().default(false),
  bookingIntervalMinutes: z.coerce.number().int().min(15).max(120).default(30),
  cancellationPolicyText: z.string().trim().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.minGuests > data.maxGuests) ctx.addIssue({ code: "custom", path: ["maxGuests"], message: "Максимум гостей не может быть меньше минимума." });
  if (data.maxSeatsSelection != null && data.minSeatsSelection > data.maxSeatsSelection) ctx.addIssue({ code: "custom", path: ["maxSeatsSelection"], message: "Максимум выбранных мест не может быть меньше минимума." });
});
export const tableTypeSchema = z.object({ title: z.string().trim().min(2), code: z.string().trim().min(2).regex(/^[a-z0-9_-]+$/), description: z.string().trim().optional().nullable(), minGuests: z.coerce.number().int().min(1).default(1), maxGuests: z.coerce.number().int().min(1), defaultDepositAmount: z.coerce.number().int().nonnegative().default(0), defaultBookingPrice: z.coerce.number().int().nonnegative().default(0), isDepositRequired: z.coerce.boolean().default(false), isActive: z.coerce.boolean().default(true) }).superRefine((data, ctx) => { if (data.minGuests > data.maxGuests) ctx.addIssue({ code: "custom", path: ["maxGuests"], message: "Максимум гостей не может быть меньше минимума." }); });
export const bookingPricingRuleSchema = z.object({ title: z.string().trim().min(2), tableTypeId: z.string().optional().nullable(), tableId: z.string().optional().nullable(), minGuests: z.coerce.number().int().positive().optional().nullable(), maxGuests: z.coerce.number().int().positive().optional().nullable(), dayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(), startTime: timeSchema.optional().nullable(), endTime: timeSchema.optional().nullable(), depositAmount: z.coerce.number().int().nonnegative().default(0), bookingPrice: z.coerce.number().int().nonnegative().default(0), isDepositRequired: z.coerce.boolean().default(false), priority: z.coerce.number().int().default(0), isActive: z.coerce.boolean().default(true) }).superRefine((data, ctx) => { if (data.minGuests != null && data.maxGuests != null && data.minGuests > data.maxGuests) ctx.addIssue({ code: "custom", path: ["maxGuests"], message: "Максимум гостей не может быть меньше минимума." }); });
export const reservationDepositSettingsSchema = z.object({ depositEnabled: z.coerce.boolean().default(false), depositMode: z.string().default("disabled"), defaultDepositAmount: z.coerce.number().int().nonnegative().default(0), requireDepositForLargeTables: z.coerce.boolean().default(false), requireDepositForGuestsFrom: z.coerce.number().int().positive().optional().nullable(), requireDepositForPeakHours: z.coerce.boolean().default(false), requireDepositForHighRiskGuests: z.coerce.boolean().default(false), paymentTimeoutMinutes: z.coerce.number().int().min(1).max(1440).default(20), depositRefundPolicyText: z.string().trim().optional().nullable(), depositAccountingText: z.string().trim().optional().nullable(), legalNoticeText: z.string().trim().optional().nullable(), isActive: z.coerce.boolean().default(true) });
export const restaurantPaymentSettingsSchema = z.object({
  paymentMode: z.enum([PAYMENT_MODES.FREE, PAYMENT_MODES.EXTERNAL_DEPOSIT]).default(PAYMENT_MODES.FREE),
  externalDepositAmount: z.coerce.number().int().min(0).default(0),
  externalPaymentUrl: z.string().trim().optional().nullable(),
  paymentTermsText: z.string().trim().optional().nullable(),
  isPaymentEnabled: z.coerce.boolean().default(false),
  showDepositInfo: z.coerce.boolean().default(true),
}).superRefine((data, ctx) => {
  if (!data.isPaymentEnabled || data.paymentMode !== PAYMENT_MODES.EXTERNAL_DEPOSIT) return;
  if (data.externalDepositAmount <= 0) ctx.addIssue({ code: "custom", path: ["externalDepositAmount"], message: "Введите сумму депозита." });
  if (!data.externalPaymentUrl) {
    ctx.addIssue({ code: "custom", path: ["externalPaymentUrl"], message: "Для платной брони укажите ссылку на оплату." });
    return;
  }
  if (!isSafeExternalPaymentUrl(data.externalPaymentUrl)) ctx.addIssue({ code: "custom", path: ["externalPaymentUrl"], message: "Укажите корректную HTTPS-ссылку на оплату." });
});
export const noShowSettingsSchema = z.object({ reminderEnabled: z.coerce.boolean().default(true), reminderHoursBefore: z.coerce.number().int().min(1).max(168).default(24), secondReminderEnabled: z.coerce.boolean().default(true), secondReminderMinutesBefore: z.coerce.number().int().min(15).max(1440).default(120), requireGuestConfirmation: z.coerce.boolean().default(true), confirmationDeadlineMinutesBefore: z.coerce.number().int().min(15).max(1440).default(120), autoMarkAtRiskEnabled: z.coerce.boolean().default(true) });
export const calculateReservationPriceSchema = z.object({ restaurantId: z.string().optional(), tableId: z.string().optional().nullable(), tableTypeId: z.string().optional().nullable(), guestsCount: z.coerce.number().int().positive(), reservationDate: dateSchema, startTime: timeSchema, endTime: timeSchema.optional().nullable(), phone: z.string().trim().optional().nullable(), guestId: z.string().optional().nullable() });

export function formToObject(formData: FormData) { return Object.fromEntries(formData.entries()); }
export function zodError(error: unknown) { return error instanceof z.ZodError ? error.issues[0]?.message ?? "Проверьте заполнение формы" : "Не удалось обработать запрос"; }
export function optionalDate(value: string | undefined) { return value ? new Date(`${value}T00:00:00.000Z`) : null; }
export function cleanOptional(value: string | undefined) { const normalized = value?.trim(); return normalized ? normalized : null; }
export function redirectPath(path: string, key: "error" | "success", message: string) { const separator = path.includes("?") ? "&" : "?"; return `${path}${separator}${key}=${encodeURIComponent(message)}`; }
