export const businessCategories = [
  "Кафе и рестораны",
  "Салоны красоты",
  "Барбершопы",
  "Автомойки",
  "Частные клиники",
  "Детские центры",
  "Мастера услуг",
  "Небольшие магазины",
];

export const leadStatuses = ["new", "in_progress", "done", "cancelled"] as const;
export const leadStatusLabels: Record<(typeof leadStatuses)[number], string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

export const contentTypes = ["post_vk", "post_telegram", "promo_text", "menu_description", "landing_text", "review_reply"] as const;
export const contentTypeLabels: Record<(typeof contentTypes)[number], string> = {
  post_vk: "Пост VK",
  post_telegram: "Пост Telegram",
  promo_text: "Текст акции",
  menu_description: "Описание меню/услуги",
  landing_text: "Текст лендинга",
  review_reply: "Ответ на отзыв",
};
export const contentTones = ["дружелюбный", "официальный", "продающий", "короткий", "премиальный"];

export const ROLES = {
  ADMIN: "admin",
  PLATFORM_ADMIN: "platform_admin",
  RESTAURANT_OWNER: "restaurant_owner",
  RESTAURANT_MANAGER: "restaurant_manager",
  RESTAURANT_STAFF: "restaurant_staff",
  WAITER: "waiter",
  CUSTOMER: "customer",
  GUEST: "guest",
} as const;
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.PLATFORM_ADMIN] as const;
export const STAFF_ROLES = [ROLES.RESTAURANT_MANAGER, ROLES.RESTAURANT_STAFF, ROLES.WAITER] as const;
export const OWNER_ROLES = [ROLES.ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_MANAGER, ROLES.RESTAURANT_STAFF, ROLES.WAITER, "owner"] as const;
export const RESTAURANT_WRITE_ROLES = [ROLES.ADMIN, ROLES.PLATFORM_ADMIN, ROLES.RESTAURANT_OWNER] as const;
export const WAITER_ALLOWED_PAGES = ["reservations", "guests", "menu", "halls"] as const;
export const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор платформы",
  platform_admin: "Администратор платформы",
  restaurant_owner: "Владелец ресторана",
  restaurant_manager: "Сотрудник ресторана",
  restaurant_staff: "Сотрудник ресторана",
  waiter: "Официант",
  customer: "Гость",
  guest: "Гость",
  owner: "Владелец ресторана",
};
export const RESTAURANT_STATUSES = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" } as const;
export const RESERVATION_STATUSES = {
  NEW: "new",
  AWAITING_RESTAURANT_CONFIRMATION: "awaiting_restaurant_confirmation",
  CONFIRMED_BY_RESTAURANT: "confirmed_by_restaurant",
  AWAITING_DEPOSIT_PAYMENT: "awaiting_deposit_payment",
  DEPOSIT_PAID: "deposit_paid",
  CONFIRMED_BY_GUEST: "confirmed_by_guest",
  CONFIRMED: "confirmed",
  SEATED: "seated",
  CANCELLED_BY_GUEST: "cancelled_by_guest",
  CANCELLED_BY_RESTAURANT: "cancelled_by_restaurant",
  PAYMENT_EXPIRED: "payment_expired",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
} as const;
export const PAYMENT_STATUSES = {
  PENDING: "pending",
  WAITING_FOR_PAYMENT: "waiting_for_payment",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  EXPIRED: "expired",
} as const;
export const PAYMENT_MODES = {
  FREE: "free",
  EXTERNAL_DEPOSIT: "external_deposit",
} as const;
export const EXTERNAL_PAYMENT_STATUSES = {
  NOT_REQUIRED: "not_required",
  AWAITING_EXTERNAL_PAYMENT: "awaiting_external_payment",
  PAID_TO_RESTAURANT: "paid_to_restaurant",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;
export const EXTERNAL_PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_required: "Оплата не требуется",
  awaiting_external_payment: "Ожидает оплаты ресторану",
  paid_to_restaurant: "Оплачена ресторану",
  cancelled: "Отменена",
  refunded: "Возвращена",
};
export const VERIFICATION_PROVIDERS = {
  MAX: "max",
  VK: "vk",
} as const;
export const VERIFICATION_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;
export const VERIFICATION_PROVIDER_LABELS: Record<string, string> = {
  max: "MAX",
  vk: "VK",
  vk_id: "VK ID",
};
export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждено",
  expired: "Истекло",
  cancelled: "Отменено",
  failed: "Ошибка подтверждения",
};
export const NO_SHOW_RISK_LEVELS = { LOW: "low", MEDIUM: "medium", HIGH: "high" } as const;
export const DEPOSIT_MODES = ["disabled", "by_table_type", "by_guests_count", "by_time", "by_risk", "custom_rules"] as const;
export const TABLE_SHAPES = ["rectangle", "circle", "square"] as const;
export const CUISINE_TYPES = [
  "европейская",
  "русская",
  "итальянская",
  "грузинская",
  "кавказская",
  "средиземноморская",
  "испанская",
  "азиатская",
  "авторская",
  "морепродукты",
  "сыроварня",
  "винный бар",
  "стейки",
  "бар",
  "bbq",
  "кафе",
  "домашняя кухня",
  "детское меню",
  "десерты",
  "кофейня",
  "завтраки",
] as const;
export const RESTAURANT_FEATURES = [
  "с детьми",
  "летняя веранда",
  "живая музыка",
  "парковка",
  "бизнес-ланч",
  "доставка",
  "банкетный зал",
  "pet-friendly",
  "семейный",
  "вино",
  "завтраки",
  "коктейли",
  "открытая кухня",
  "видовой",
  "сыроварня",
  "сомелье",
  "крафт",
  "мясо",
  "бар",
  "кофе",
  "десерты",
  "караоке",
  "кальян",
  "спорт",
  "недорого",
  "морепродукты",
] as const;
export const DAY_LABELS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"] as const;

export function isLeadStatus(value: string): value is (typeof leadStatuses)[number] {
  return leadStatuses.includes(value as (typeof leadStatuses)[number]);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
