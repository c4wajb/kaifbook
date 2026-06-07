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

export function isAdultOnlyRestaurant(restaurant: AdultContentRestaurant) {
  const searchableText = [
    restaurant.title,
    restaurant.shortDescription,
    restaurant.description,
    restaurant.cuisineTypes,
    restaurant.features,
    restaurant.tags,
    restaurant.badges,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");

  return ADULT_CONTENT_MARKERS.some((marker) => searchableText.includes(marker));
}
