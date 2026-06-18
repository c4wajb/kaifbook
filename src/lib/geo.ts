/**
 * Geo helpers — pure, dependency-free, safe on both server and client.
 *
 * Distances are computed locally from stored restaurant coordinates and the
 * user's coordinates (obtained on the client via geolocation). No network /
 * API key is involved here — see `app/api/geocode` for address → coordinates.
 */

export type LatLng = { latitude: number; longitude: number };
/** Loose input: coordinate fields may be absent or null (e.g. a DB row). */
export type LatLngInput = { latitude?: number | null; longitude?: number | null } | null | undefined;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two points in kilometres (haversine).
 * Returns `null` if either point is missing/invalid so callers can render a
 * graceful fallback instead of "NaN км".
 */
export function haversineKm(a: LatLngInput, b: LatLngInput): number | null {
  const lat1 = a?.latitude;
  const lng1 = a?.longitude;
  const lat2 = b?.latitude;
  const lng2 = b?.longitude;
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Human-readable distance in Russian. Under 1 km → metres rounded to 50 m
 * ("350 м"); otherwise kilometres with one decimal and a comma ("1,2 км"),
 * dropping the decimal once it stops being useful ("12 км"). `null` in → `null`.
 */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;

  if (km < 1) {
    const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${metres} м`;
  }
  if (km >= 100) return `${Math.round(km)} км`;
  const rounded = Math.round(km * 10) / 10;
  const text = (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");
  return `${text} км`;
}

/** Convenience: distance between user and a place, already formatted. */
export function distanceLabel(user: LatLngInput, place: LatLngInput): string | null {
  return formatDistance(haversineKm(user, place));
}
