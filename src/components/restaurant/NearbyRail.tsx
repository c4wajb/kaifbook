"use client";

import Link from "next/link";
import { ChevronRight, LocateFixed, MapPin } from "lucide-react";
import { useMemo } from "react";
import { useUserLocation } from "@/components/location/UserLocationProvider";
import { haversineKm } from "@/lib/geo";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";

// A catalog row carries everything RestaurantCard needs plus an id (for keys)
// and coordinates (for ranking). Derive the shape from the card's own props so
// the two never drift.
type CardRestaurant = React.ComponentProps<typeof RestaurantCard>["restaurant"];
type NearbyItem = CardRestaurant & { id: string };

type NearbyRailProps = {
  /** Full candidate set — re-sorted by real distance once the user shares location. */
  restaurants: NearbyItem[];
  /** Server-picked order shown until (or unless) the user shares location. */
  fallback: NearbyItem[];
  showAllHref: string;
  limit?: number;
};

export function NearbyRail({ restaurants, fallback, showAllHref, limit = 6 }: NearbyRailProps) {
  const { coords, status, request, supported } = useUserLocation();
  const located = status === "granted" && coords != null;

  const list = useMemo(() => {
    if (!located) return fallback.slice(0, limit);
    const ranked = restaurants
      .map((r) => ({ r, km: haversineKm(coords, { latitude: r.latitude, longitude: r.longitude }) }))
      .filter((x): x is { r: NearbyItem; km: number } => x.km != null)
      .sort((a, b) => a.km - b.km)
      .map((x) => x.r);
    // If too few have coordinates, top up from the fallback so the rail is never sparse.
    const seen = new Set(ranked.map((r) => r.id));
    const filler = fallback.filter((r) => !seen.has(r.id));
    return [...ranked, ...filler].slice(0, limit);
  }, [located, coords, restaurants, fallback, limit]);

  if (!fallback.length) return null;

  return (
    <section className="catalog-section">
      <div className="section-heading">
        <h2>{located ? "Рядом с вами" : "Популярные"}</h2>
        <div className="nearby-controls">
          {supported && !located ? (
            <button type="button" className="small-button nearby-locate-button" onClick={request} disabled={status === "locating"}>
              <LocateFixed size={15} aria-hidden />
              {status === "locating" ? "Определяем…" : "Показать поблизости"}
            </button>
          ) : null}
          {located ? (
            <span className="nearby-located-chip">
              <MapPin size={14} aria-hidden /> рядом с вами
            </span>
          ) : null}
          <Link className="small-button show-all-link" href={showAllHref} scroll={false}>
            Показать все <ChevronRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
      {status === "denied" ? (
        <p className="nearby-hint muted">Доступ к геолокации отключён — показываем популярные. Разрешите доступ в настройках, чтобы видеть ближайшие.</p>
      ) : null}
      {status === "unavailable" ? <p className="nearby-hint muted">Не удалось определить местоположение — показываем популярные.</p> : null}
      <div className="restaurant-rail">
        {list.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />
        ))}
      </div>
    </section>
  );
}
