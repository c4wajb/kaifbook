import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { RestaurantFilters } from "@/components/RestaurantFilters";
import { VkMiniAppShell } from "@/components/VkMiniAppShell";
import { getPublicRestaurants, getRestaurantFilterOptions } from "@/lib/public-data";

type Props = {
  searchParams: Promise<{ q?: string; city?: string; cuisine?: string; feature?: string; averageCheck?: string; type?: string; open?: string }>;
};

const quickFilters = [
  { label: "Рядом", href: "/vk-mini#restaurant-list" },
  { label: "Недорого", href: "/vk-mini?averageCheck=1800#restaurant-list" },
  { label: "Музыка", href: "/vk-mini?feature=живая%20музыка#restaurant-list" },
  { label: "С детьми", href: "/vk-mini?feature=с%20детьми#restaurant-list" },
  { label: "Веранда", href: "/vk-mini?feature=летняя%20веранда#restaurant-list" },
  { label: "Итальянская", href: "/vk-mini?cuisine=итальянская#restaurant-list" },
];

function hasActiveFilters(filters: Awaited<Props["searchParams"]>) {
  return Boolean(filters.q || filters.city || filters.cuisine || filters.feature || filters.averageCheck || filters.type || filters.open);
}

function isQuickFilterActive(filters: Awaited<Props["searchParams"]>, href: string) {
  const url = new URL(href, "https://kaifbook.local");
  const params = url.searchParams;
  if (![...params.keys()].length) return !hasActiveFilters(filters);
  return [...params.entries()].every(([key, value]) => filters[key as keyof typeof filters] === value);
}

export default async function VkMiniHomePage({ searchParams }: Props) {
  const filters = await searchParams;
  const [restaurants, options] = await Promise.all([getPublicRestaurants(filters), getRestaurantFilterOptions()]);

  return (
    <VkMiniAppShell active="home">
      <section className="vk-mini-hero">
        <p className="eyebrow">Kaifbook в VK</p>
        <h1>Выберите ресторан и забронируйте стол</h1>
        <p>Каталог заведений, быстрый выбор даты и понятная заявка без звонков.</p>
      </section>

      <div className="vk-mini-quick-row" aria-label="Быстрые подборки">
        {quickFilters.map((filter) => (
          <Link key={filter.label} className={isQuickFilterActive(filters, filter.href) ? "active" : ""} href={filter.href} scroll={false}>
            {filter.label}
          </Link>
        ))}
      </div>

      <RestaurantFilters values={filters} cities={options.cities} layoutMode="grid" basePath="/vk-mini" />

      <section id="restaurant-list" className="vk-mini-section">
        <div className="vk-mini-section-head">
          <div>
            <p className="eyebrow">Каталог</p>
            <h2>{hasActiveFilters(filters) ? "Подходящие рестораны" : "Рестораны рядом"}</h2>
          </div>
          <span>{restaurants.length}</span>
        </div>

        {restaurants.length ? (
          <div className="vk-mini-restaurant-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                compact
                restaurantBasePath="/vk-mini/restaurants"
                bookingPath="booking"
                variant="mini"
              />
            ))}
          </div>
        ) : (
          <div className="empty-state vk-mini-empty">
            <strong>Рестораны не найдены</strong>
            <span>Попробуйте изменить запрос или сбросить фильтры.</span>
            <Link className="small-button" href="/vk-mini#restaurant-list" scroll={false}>
              Сбросить <ChevronRight size={15} aria-hidden />
            </Link>
          </div>
        )}
      </section>
    </VkMiniAppShell>
  );
}
