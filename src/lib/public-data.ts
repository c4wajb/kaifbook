import { RESTAURANT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
export type RestaurantFilters = { q?: string; city?: string; cuisine?: string; feature?: string; averageCheck?: string; type?: string; open?: string };

function includesText(value: string | null | undefined, query: string) {
  return Boolean(value?.toLowerCase().includes(query.toLowerCase()));
}

function minutesFromTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function isOpenNow(workingHours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]) {
  const now = new Date();
  const today = workingHours.find((item) => item.dayOfWeek === now.getDay());
  if (!today || today.isClosed) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
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

export async function getPublicRestaurants(filters: RestaurantFilters = {}) {
  const averageCheck = Number(filters.averageCheck || 0);
  const restaurants = await prisma.restaurant.findMany({ where: { isActive: true, status: RESTAURANT_STATUSES.APPROVED, city: filters.city || undefined, averageCheck: averageCheck > 0 ? { lte: averageCheck } : undefined, cuisineTypes: filters.cuisine ? { contains: filters.cuisine } : undefined, features: filters.feature ? { contains: filters.feature } : undefined }, include: { workingHours: { orderBy: { dayOfWeek: "asc" } } }, orderBy: [{ isFeatured: "desc" }, { bannerSortOrder: "asc" }, { rating: "desc" }, { city: "asc" }, { title: "asc" }] });

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

export async function getHomeBannerRestaurants() {
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
}
export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findFirst({
    where: { slug, isActive: true, status: RESTAURANT_STATUSES.APPROVED },
    include: {
      settings: true,
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
}
export async function getRestaurantFilterOptions() {
  const restaurants = await prisma.restaurant.findMany({ where: { isActive: true, status: RESTAURANT_STATUSES.APPROVED }, select: { city: true } });
  return { cities: [...new Set(restaurants.map((restaurant) => restaurant.city))].sort() };
}
