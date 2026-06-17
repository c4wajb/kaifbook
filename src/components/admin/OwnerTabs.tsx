import Link from "next/link";

const WAITER_TABS = new Set(["Брони", "Гости", "Меню", "Схема зала"]);

export function OwnerTabs({ restaurantId, isStaff }: { restaurantId: string; isStaff?: boolean }) {
  const allTabs = [
    ["Описание", `/owner/restaurants/${restaurantId}/edit`],
    ["Брони", `/owner/restaurants/${restaurantId}/reservations`],
    ["История броней", `/owner/restaurants/${restaurantId}/reservation-history`],
    ["Гости", `/owner/restaurants/${restaurantId}/guests`],
    ["Аналитика", `/owner/restaurants/${restaurantId}/analytics`],
    ["Неявки", `/owner/restaurants/${restaurantId}/no-show`],
    ["Меню", `/owner/restaurants/${restaurantId}/menu`],
    ["Схема зала", `/owner/restaurants/${restaurantId}/halls`],
    ["Время работы", `/owner/restaurants/${restaurantId}/working-hours`],
    ["Сотрудники", `/owner/restaurants/${restaurantId}/staff`],
    ["Настройки", `/owner/restaurants/${restaurantId}/settings`],
  ] as const;

  if (isStaff) return null;

  return (
    <nav className="tabs" aria-label="Разделы ресторана">
      {allTabs.map(([label, href]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
