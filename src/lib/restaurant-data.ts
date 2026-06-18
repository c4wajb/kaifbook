import { RESTAURANT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { geocodeAddress, geocodeQueryFor, geocoderConfigured } from "@/lib/geocode";
import { stringifyStringList } from "@/lib/json-fields";
import { createUniqueRestaurantSlug } from "@/lib/slug";
type RestaurantPayload = { title: string; slug?: string | null; description: string; shortDescription: string; city: string; address: string; phone: string; email: string; website?: string | null; averageCheck: number; cuisineTypes?: unknown; features?: unknown; mainPhotoUrl?: string | null; galleryPhotos?: unknown; status?: string; isActive?: boolean };

export async function restaurantDataFromPayload(payload: RestaurantPayload, existingId?: string) {
  const base = { title: payload.title, slug: await createUniqueRestaurantSlug(payload.title, payload.slug, existingId), description: payload.description, shortDescription: payload.shortDescription, city: payload.city, address: payload.address, phone: payload.phone, email: payload.email, website: payload.website || null, averageCheck: payload.averageCheck, cuisineTypes: stringifyStringList(payload.cuisineTypes), features: stringifyStringList(payload.features), mainPhotoUrl: payload.mainPhotoUrl || null, galleryPhotos: stringifyStringList(payload.galleryPhotos), status: payload.status || RESTAURANT_STATUSES.APPROVED, isActive: payload.isActive ?? true };

  // Geocode-on-save: fill coordinates from the address. Best-effort and only
  // when a key is configured (otherwise a no-op) and coords are still missing,
  // so we never clobber existing/hand-set coordinates on edit.
  if (geocoderConfigured() && payload.address) {
    const existing = existingId ? await prisma.restaurant.findUnique({ where: { id: existingId }, select: { latitude: true, longitude: true } }) : null;
    const needsCoords = !existing || existing.latitude == null || existing.longitude == null;
    if (needsCoords) {
      const coords = await geocodeAddress(geocodeQueryFor(payload));
      if (coords) return { ...base, latitude: coords.latitude, longitude: coords.longitude };
    }
  }

  return base;
}
