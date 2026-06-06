import { RESTAURANT_STATUSES } from "@/lib/constants";
import { stringifyStringList } from "@/lib/json-fields";
import { createUniqueRestaurantSlug } from "@/lib/slug";
type RestaurantPayload = { title: string; slug?: string | null; description: string; shortDescription: string; city: string; address: string; phone: string; email: string; website?: string | null; averageCheck: number; cuisineTypes?: unknown; features?: unknown; mainPhotoUrl?: string | null; galleryPhotos?: unknown; status?: string; isActive?: boolean };
export async function restaurantDataFromPayload(payload: RestaurantPayload, existingId?: string) {
  return { title: payload.title, slug: await createUniqueRestaurantSlug(payload.title, payload.slug, existingId), description: payload.description, shortDescription: payload.shortDescription, city: payload.city, address: payload.address, phone: payload.phone, email: payload.email, website: payload.website || null, averageCheck: payload.averageCheck, cuisineTypes: stringifyStringList(payload.cuisineTypes), features: stringifyStringList(payload.features), mainPhotoUrl: payload.mainPhotoUrl || null, galleryPhotos: stringifyStringList(payload.galleryPhotos), status: payload.status || RESTAURANT_STATUSES.APPROVED, isActive: payload.isActive ?? true };
}
