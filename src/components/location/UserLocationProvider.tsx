"use client";

import { Capacitor } from "@capacitor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

/**
 * idle        — never asked (no prompt shown yet)
 * locating    — request in flight
 * granted     — we have coordinates
 * denied      — user refused permission
 * unavailable — no geolocation support / hardware error / timeout
 */
export type GeoStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

type UserLocationValue = {
  coords: LatLng | null;
  status: GeoStatus;
  /** Ask for the user's location. Called on explicit user intent only. */
  request: () => void;
  /** Geolocation is usable on this platform at all. */
  supported: boolean;
};

const DEFAULT: UserLocationValue = { coords: null, status: "idle", request: () => {}, supported: false };

const UserLocationContext = createContext<UserLocationValue>(DEFAULT);

// Cache the granted position for the tab session so in-app navigation keeps
// showing distances without re-prompting. Not persisted to localStorage — a
// fresh visit should ask again rather than silently reuse a stale location.
const CACHE_KEY = "kb:user-coords";

function readCache(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LatLng;
    if (typeof parsed?.latitude === "number" && typeof parsed?.longitude === "number") return parsed;
  } catch {
    /* sessionStorage blocked or bad JSON — ignore */
  }
  return null;
}

export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const supported = useRef<boolean>(false);

  // Platform support + warm cache. Runs once on the client; never prompts.
  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    supported.current = native || (typeof navigator !== "undefined" && "geolocation" in navigator);
    const cached = readCache();
    if (cached) {
      setCoords(cached);
      setStatus("granted");
    }
  }, []);

  const apply = useCallback((next: LatLng) => {
    setCoords(next);
    setStatus("granted");
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/availability */
    }
  }, []);

  const request = useCallback(() => {
    setStatus((prev) => (prev === "granted" ? prev : "locating"));

    if (Capacitor.isNativePlatform()) {
      // Native: defer-load the plugin so the web bundle never imports it.
      import("@capacitor/geolocation")
        .then(async ({ Geolocation }) => {
          const perm = await Geolocation.checkPermissions().catch(() => null);
          let state = perm?.location ?? "prompt";
          if (state === "prompt" || state === "prompt-with-rationale") {
            const asked = await Geolocation.requestPermissions({ permissions: ["location"] }).catch(() => null);
            state = asked?.location ?? "denied";
          }
          if (state !== "granted") {
            setStatus("denied");
            return;
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          apply({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        })
        .catch(() => setStatus("unavailable"));
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => apply({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [apply]);

  const value = useMemo<UserLocationValue>(() => ({ coords, status, request, supported: supported.current }), [coords, status, request]);

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

/** Read the shared user-location state. Safe outside a provider (returns idle). */
export function useUserLocation(): UserLocationValue {
  return useContext(UserLocationContext);
}
