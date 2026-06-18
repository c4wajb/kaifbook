import "server-only";
import type { LatLng } from "@/lib/geo";

/**
 * Address → coordinates via the Yandex Geocoder HTTP API. SERVER ONLY — the
 * API key never reaches the client.
 *
 * Dormant by default: if `YANDEX_GEOCODER_KEY` is not set, `geocodeAddress`
 * returns `null` (and warns once) so callers degrade gracefully. Set the key
 * to enable backfilling missing restaurant coordinates and geocode-on-save.
 *
 *   YANDEX_GEOCODER_KEY=...   # https://developer.tech.yandex.ru/services (Geocoder API)
 */

const ENDPOINT = "https://geocode-maps.yandex.ru/1.x/";

let warnedNoKey = false;

export function geocoderConfigured(): boolean {
  return Boolean(process.env.YANDEX_GEOCODER_KEY);
}

export async function geocodeAddress(query: string): Promise<LatLng | null> {
  const apikey = process.env.YANDEX_GEOCODER_KEY;
  const text = query?.trim();
  if (!text) return null;

  if (!apikey) {
    if (!warnedNoKey) {
      console.warn("[geocode] YANDEX_GEOCODER_KEY is not set — geocoding is disabled (coordinates left as-is).");
      warnedNoKey = true;
    }
    return null;
  }

  const url = `${ENDPOINT}?apikey=${apikey}&format=json&results=1&lang=ru_RU&geocode=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[geocode] Yandex responded ${res.status} for "${text}"`);
      return null;
    }
    const data = (await res.json()) as YandexGeocodeResponse;
    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
    if (!pos) return null;
    // Yandex returns "longitude latitude".
    const [lonStr, latStr] = pos.split(" ");
    const longitude = Number(lonStr);
    const latitude = Number(latStr);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch (error) {
    console.warn(`[geocode] request failed for "${text}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Build the geocoder query from a restaurant's city + address. */
export function geocodeQueryFor(restaurant: { city?: string | null; address?: string | null }): string {
  return [restaurant.city, restaurant.address].filter(Boolean).join(", ");
}

// --- Minimal shape of the bits of the Yandex response we read ---
type YandexGeocodeResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{ GeoObject?: { Point?: { pos?: string } } }>;
    };
  };
};
