import Link from "next/link";

export function OwnerTabs({ restaurantId }: { restaurantId: string }) {
  const tabs = [
    ["Описание", `/owner/restaurants/${restaurantId}/edit`],
    ["Брони", `/owner/restaurants/${restaurantId}/reservations`],
    ["История броней", `/owner/restaurants/${restaurantId}/reservation-history`],
    ["Гости", `/owner/restaurants/${restaurantId}/guests`],
    ["Аналитика", `/owner/restaurants/${restaurantId}/analytics`],
    ["Неявки", `/owner/restaurants/${restaurantId}/no-show`],
    ["Меню", `/owner/restaurants/${restaurantId}/menu`],
    ["Схема зала", `/owner/restaurants/${restaurantId}/halls`],
    ["Время работы", `/owner/restaurants/${restaurantId}/working-hours`],
    ["Настройки", `/owner/restaurants/${restaurantId}/settings`],
  ] as const;

  return (
    <nav className="tabs" aria-label="Разделы ресторана">
      {tabs.map(([label, href]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
