type AdultContentRestaurant = {
  badges?: string | null;
  cuisineTypes?: string | null;
  description?: string | null;
  features?: string | null;
  shortDescription?: string | null;
  tags?: string | null;
  title?: string | null;
};

const ADULT_CONTENT_MARKERS = ["кальян", "hookah", "shisha", "табак", "tobacco", "18+"];

export function textHasAdultMarker(...values: (string | null | undefined)[]) {
  const searchableText = values
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
  return ADULT_CONTENT_MARKERS.some((marker) => searchableText.includes(marker));
}

export function isAdultOnlyRestaurant(restaurant: AdultContentRestaurant) {
  return textHasAdultMarker(
    restaurant.title,
    restaurant.shortDescription,
    restaurant.description,
    restaurant.cuisineTypes,
    restaurant.features,
    restaurant.tags,
    restaurant.badges,
  );
}

// True when the active catalog filters/search single out adult content (e.g. the
// "Кальян" quick filter, or a search for «кальян»), so the catalog should gate.
export function filtersImplyAdultContent(filters: { feature?: string | null; cuisine?: string | null; q?: string | null }) {
  return textHasAdultMarker(filters.feature, filters.cuisine, filters.q);
}
