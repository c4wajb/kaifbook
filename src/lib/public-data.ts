import { unstable_cache } from "next/cache";
import { RESTAURANT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { appTzOffsetMinutes } from "@/lib/time";
export type RestaurantFilters = { q?: string; city?: string; cuisine?: string; feature?: string; averageCheck?: string; type?: string; open?: string };

function includesText(value: string | null | undefined, query: string) {
  return Boolean(value?.toLowerCase().includes(query.toLowerCase()));
}

function minutesFromTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function isOpenNow(workingHours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]) {
  // openTime/closeTime are Moscow wall-clock; the prod server runs on UTC, so
  // shift "now" by the app TZ offset and read it as wall-clock (getUTC*).
  const now = new Date(Date.now() + appTzOffsetMinutes() * 60_000);
  const today = workingHours.find((item) => item.dayOfWeek === now.getUTCDay());
  if (!today || today.isClosed) return false;

  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const openMinutes = minutesFromTime(today.openTime);
  const closeMinutes = minutesFromTime(today.closeTime);

  if (closeMinutes <= openMinutes) return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function isOpenLate(workingHours: { closeTime: string; openTime: string; isClosed: boolean }[]) {
  return workingHours.some((item) => !item.isClosed && (minutesFromTime(item.closeTime) >= 23 * 60 || minutesFromTime(item.closeTime) <= minutesFromTime(item.openTime)));
}

function matchesNameSearch(value: string | null | undefined, query: string | undefined) {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return true;
  return Boolean(value?.toLowerCase().includes(normalized));
}

// --- Cached data fetching ---

const fetchAllRestaurants = unstable_cache(
  async (city?: string, cuisine?: string, feature?: string, averageCheckMax = 0) => {
    return prisma.restaurant.findMany({
      where: {
        isActive: true,
        status: RESTAURANT_STATUSES.APPROVED,
        city: city || undefined,
        averageCheck: averageCheckMax > 0 ? { lte: averageCheckMax } : undefined,
        cuisineTypes: cuisine ? { contains: cuisine } : undefined,
        features: feature ? { contains: feature } : undefined,
      },
      include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: [{ isFeatured: "desc" }, { bannerSortOrder: "asc" }, { rating: "desc" }, { city: "asc" }, { title: "asc" }],
    });
  },
  ["public-restaurants"],
  { revalidate: 60 },
);

export async function getPublicRestaurants(filters: RestaurantFilters = {}) {
  const averageCheck = Number(filters.averageCheck || 0);
  const restaurants = await fetchAllRestaurants(filters.city, filters.cuisine, filters.feature, averageCheck);

  return restaurants.filter((restaurant) => {
    if (!matchesNameSearch(restaurant.title, filters.q)) return false;

    if (filters.type) {
      const type = filters.type.toLowerCase();
      const matchesType =
        includesText(restaurant.title, type) ||
        includesText(restaurant.shortDescription, type) ||
        includesText(restaurant.description, type) ||
        includesText(restaurant.cuisineTypes, type) ||
        includesText(restaurant.features, type) ||
        includesText(restaurant.tags, type);
      if (!matchesType) return false;
    }

    if (filters.open === "open" && !isOpenNow(restaurant.workingHours)) return false;
    if (filters.open === "late" && !isOpenLate(restaurant.workingHours)) return false;

    return true;
  });
}

export const getHomeBannerRestaurants = unstable_cache(
  async () => {
    const featured = await prisma.restaurant.findMany({
      where: { isActive: true, status: RESTAURANT_STATUSES.APPROVED, isFeatured: true },
      include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: [{ bannerSortOrder: "asc" }, { rating: "desc" }, { title: "asc" }],
      take: 8,
    });
    if (featured.length) return featured;
    return prisma.restaurant.findMany({
      where: { isActive: true, status: RESTAURANT_STATUSES.APPROVED },
      include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }, { title: "asc" }],
      take: 6,
    });
  },
  ["home-banner-restaurants"],
  { revalidate: 60 },
);

export const getRestaurantBySlug = unstable_cache(
  async (slug: string) => {
    return prisma.restaurant.findFirst({
      where: { slug, isActive: true, status: RESTAURANT_STATUSES.APPROVED },
      include: {
        settings: true,
        depositSettings: true,
        workingHours: { orderBy: { dayOfWeek: "asc" } },
        menuCategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } } },
        halls: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            tables: { where: { isActive: true }, include: { tableType: true }, orderBy: [{ y: "asc" }, { x: "asc" }] },
            objects: { orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }] },
          },
        },
        reviews: { orderBy: { publishedAt: "desc" }, take: 6 },
      },
    });
  },
  ["restaurant-by-slug"],
  { revalidate: 60, tags: ["restaurant-menu"] },
);

export const getRestaurantFilterOptions = unstable_cache(
  async () => {
    const restaurants = await prisma.restaurant.findMany({ where: { isActive: true, status: RESTAURANT_STATUSES.APPROVED }, select: { city: true } });
    return { cities: [...new Set(restaurants.map((restaurant) => restaurant.city))].sort() };
  },
  ["restaurant-filter-options"],
  { revalidate: 120 },
);
