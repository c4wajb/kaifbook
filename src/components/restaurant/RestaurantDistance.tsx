"use client";

import { useEffect, useState } from "react";
import { distanceLabel, type LatLng } from "@/lib/geo";

// Same session cache the catalog's UserLocationProvider writes. Reading it here
// lets the profile hero show a real, user-relative distance when the visitor
// already shared their location elsewhere — without prompting again.
const CACHE_KEY = "kb:user-coords";

/**
 * Renders "<distance> · " before the address on the restaurant profile.
 * Prefers the real distance from the user's cached location; otherwise falls
 * back to the stored `fallback` text; renders nothing if neither is available.
 */
export function RestaurantDistance({ latitude, longitude, fallback }: { latitude?: number | null; longitude?: number | null; fallback?: string | null }) {
  const [coords, setCoords] = useState<LatLng | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LatLng;
      if (typeof parsed?.latitude === "number" && typeof parsed?.longitude === "number") setCoords(parsed);
    } catch {
      /* sessionStorage blocked or bad JSON — keep fallback */
    }
  }, []);

  const real = coords ? distanceLabel(coords, { latitude, longitude }) : null;
  const text = real ?? fallback ?? null;
  if (!text) return null;
  return (
    <>
      {real ? <strong className="restaurant-card-distance">{text}</strong> : text} {" · "}
    </>
  );
}
