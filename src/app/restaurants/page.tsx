import type { Metadata } from "next";
import Link from "next/link";
import { Baby, ChevronRight, Coffee, Flame, MapPin, Music, PiggyBank, Sun, UtensilsCrossed } from "lucide-react";

export const metadata: Metadata = {
  title: "Рестораны Курска — бронирование столиков онлайн | Kaifbook",
  description: "Выберите ресторан в Курске и забронируйте стол онлайн. Меню, отзывы, фото, режим работы и бронирование без регистрации.",
  openGraph: {
    title: "Рестораны Курска — бронирование столиков онлайн | Kaifbook",
    description: "Выберите ресторан в Курске и забронируйте стол онлайн. Меню, отзывы, фото, режим работы и бронирование без регистрации.",
    type: "website",
  },
};
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { RestaurantCard } from "@/components/RestaurantCard";
import { RestaurantFilters } from "@/components/RestaurantFilters";
import { parseStringList } from "@/lib/json-fields";
import { getHomeBannerRestaurants, getPublicRestaurants, getRestaurantFilterOptions } from "@/lib/public-data";

type Props = { searchParams: Promise<{ q?: string; city?: string; cuisine?: string; feature?: string; averageCheck?: string; type?: string; open?: string; view?: string; layout?: string }> };
type Restaurant = Awaited<ReturnType<typeof getPublicRestaurants>>[number];
type FilterKey = "feature" | "cuisine" | "averageCheck" | "type" | "open";
type LayoutMode = "grid" | "large";

const quickFilters = [
  { label: "Рядом", href: "/restaurants#restaurant-list", icon: MapPin },
  { label: "Недорого", href: "/restaurants?averageCheck=1800#restaurant-list", icon: PiggyBank },
  { label: "С живой музыкой", href: "/restaurants?feature=живая%20музыка#restaurant-list", icon: Music },
  { label: "Видовой", href: "/restaurants?feature=видовой#restaurant-list", icon: Sun },
  { label: "С верандой", href: "/restaurants?feature=летняя%20веранда#restaurant-list", icon: Coffee },
  { label: "С детьми", href: "/restaurants?feature=с%20детьми#restaurant-list", icon: Baby },
  { label: "Завтраки", href: "/restaurants?cuisine=завтраки#restaurant-list", icon: Flame },
  { label: "Грузинская кухня", href: "/restaurants?cuisine=грузинская#restaurant-list", icon: UtensilsCrossed },
  { label: "Итальянская кухня", href: "/restaurants?cuisine=итальянская#restaurant-list", icon: UtensilsCrossed },
];

function hasCuisine(restaurant: Restaurant, cuisine: string) {
  return parseStringList(restaurant.cuisineTypes).some((item) => item.toLowerCase().includes(cuisine));
}

function hasFeature(restaurant: Restaurant, feature: string) {
  return parseStringList(restaurant.features).some((item) => item.toLowerCase().includes(feature));
}

function categoryHref(filter: FilterKey, value: string) {
  const params = new URLSearchParams({ [filter]: value });
  return `/restaurants?${params.toString()}#restaurant-list`;
}

function hrefWithLayout(href: string, layout: LayoutMode) {
  if (layout === "grid") return href;
  const url = new URL(href, "https://kaifbook.local");
  url.searchParams.set("layout", layout);
  return `/restaurants${url.search}${url.hash}`;
}

function isQuickFilterActive(filters: Awaited<Props["searchParams"]>, href: string) {
  const url = new URL(href, "https://kaifbook.local");
  const params = url.searchParams;
  const hasActiveFilter = Boolean(filters.q || filters.city || filters.cuisine || filters.feature || filters.averageCheck || filters.type || filters.open || filters.view);

  if (![...params.keys()].length) return !hasActiveFilter;
  return [...params.entries()].every(([key, value]) => filters[key as keyof typeof filters] === value);
}

function RestaurantSection({ title, restaurants, showAllHref, layout = "grid" }: { title: string; restaurants: Restaurant[]; showAllHref: string; layout?: LayoutMode }) {
  if (!restaurants.length) return null;
  const visibleRestaurants = layout === "large" ? restaurants.slice(0, 4) : restaurants;

  return (
    <section className="catalog-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <Link className="small-button show-all-link" href={hrefWithLayout(showAllHref, layout)} scroll={false}>
          Показать все <ChevronRight size={15} aria-hidden />
        </Link>
      </div>
      <div className="restaurant-rail">
        {visibleRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />
        ))}
      </div>
    </section>
  );
}

export default async function RestaurantsPage({ searchParams }: Props) {
  const filters = await searchParams;
  const hasActiveFilters = Boolean(filters.q || filters.city || filters.cuisine || filters.feature || filters.averageCheck || filters.type || filters.open);
  const layoutMode: LayoutMode = filters.layout === "large" ? "large" : "grid";
  const [restaurants, options, bannerRestaurants] = await Promise.all([getPublicRestaurants(filters), getRestaurantFilterOptions(), getHomeBannerRestaurants()]);
  const allRestaurants = hasActiveFilters ? await getPublicRestaurants() : restaurants;
  const showFlatList = filters.view === "all" || hasActiveFilters;
  const listingRestaurants = filters.view === "all" ? allRestaurants : restaurants;
  // Build sections with no duplicates: each restaurant appears in at most one shelf
  const usedIds = new Set<string>();

  function takeUnique(source: Restaurant[], limit = 6): Restaurant[] {
    const result: Restaurant[] = [];
    for (const r of source) {
      if (usedIds.has(r.id)) continue;
      result.push(r);
      if (result.length >= limit) break;
    }
    for (const r of result) usedIds.add(r.id);
    return result;
  }

  const nearbySection = takeUnique(allRestaurants);
  const bestSorted = [...allRestaurants].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const bestSection = takeUnique(bestSorted);
  const dinnerSection = takeUnique(allRestaurants.filter((r) => hasCuisine(r, "европ") || hasCuisine(r, "стейк") || hasCuisine(r, "рус") || hasFeature(r, "бар")));
  const breakfastSection = takeUnique(allRestaurants.filter((r) => hasCuisine(r, "завтрак") || hasCuisine(r, "коф") || hasFeature(r, "завтрак")));
  const familySection = takeUnique(allRestaurants.filter((r) => hasFeature(r, "семей") || hasFeature(r, "деть")));
  const verandaSection = takeUnique(allRestaurants.filter((r) => hasFeature(r, "веранд") || hasFeature(r, "видовой")));
  const budgetSection = takeUnique(allRestaurants.filter((r) => r.averageCheck <= 1800));

  return (
    <div className={`page client-page catalog-page catalog-layout-${layoutMode}`}>
      <h1 className="visually-hidden">Рестораны в Курске</h1>

      <div className="quick-filter-row catalog-quick-row" aria-label="Быстрые подборки">
        {quickFilters.map((filter) => (
          <Link key={filter.label} href={filter.href} className={isQuickFilterActive(filters, filter.href) ? "active" : undefined} scroll={false}>
            <filter.icon size={15} aria-hidden />
            {filter.label}
          </Link>
        ))}
      </div>

      <HomeBannerSlider restaurants={bannerRestaurants} />

      <RestaurantFilters values={filters} cities={options.cities} layoutMode={layoutMode} />

      <div id="restaurant-list" className="restaurant-list-anchor">
        {showFlatList ? (
          <section className="catalog-section">
            <div className="section-heading">
              <h2>{filters.view === "all" ? "Все рестораны" : "Подходящие рестораны"}</h2>
              <span className="muted">{listingRestaurants.length} заведений</span>
            </div>
            {listingRestaurants.length ? (
              <div className="restaurants-grid">
                {listingRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <div className="empty-state catalog-empty-state">
                <strong>Рестораны не найдены</strong>
                <span>Попробуйте изменить запрос или сбросить фильтры.</span>
                <Link className="small-button" href="/restaurants#restaurant-list" scroll={false}>
                  Сбросить фильтры
                </Link>
              </div>
            )}
          </section>
        ) : (
          <>
            <RestaurantSection title="Рестораны рядом" restaurants={nearbySection} showAllHref="/restaurants?view=all#restaurant-list" />
            <RestaurantSection title="Лучшие рестораны" restaurants={bestSection} showAllHref="/restaurants?view=all#restaurant-list" />
            <RestaurantSection title="Где поужинать" restaurants={dinnerSection} showAllHref={categoryHref("cuisine", "европейская")} />
            <RestaurantSection title="Завтраки" restaurants={breakfastSection} showAllHref={categoryHref("cuisine", "завтраки")} />
            <RestaurantSection title="Семейные рестораны" restaurants={familySection} showAllHref={categoryHref("feature", "с детьми")} />
            <RestaurantSection title="С верандой" restaurants={verandaSection} showAllHref={categoryHref("feature", "летняя веранда")} />
            <RestaurantSection title="Недорого" restaurants={budgetSection} showAllHref={categoryHref("averageCheck", "1800")} />
          </>
        )}
      </div>
    </div>
  );
}
