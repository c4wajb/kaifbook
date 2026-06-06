"use client";

import { Grid2X2, Rows3 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LayoutMode = "grid" | "large";

const storageKey = "kaifbook-catalog-layout";

function normalizeLayout(value: string | null | undefined): LayoutMode | null {
  return value === "grid" || value === "large" ? value : null;
}

export function CatalogLayoutToggle({ initialLayout }: { initialLayout: LayoutMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LayoutMode>(initialLayout);
  const urlMode = normalizeLayout(searchParams.get("layout"));
  const activeMode = urlMode ?? mode;
  const nextMode: LayoutMode = activeMode === "grid" ? "large" : "grid";

  const nextHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", nextMode);
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}#restaurant-list`;
  }, [nextMode, pathname, searchParams]);

  useEffect(() => {
    const saved = normalizeLayout(window.localStorage.getItem(storageKey));

    if (urlMode) {
      setMode(urlMode);
      window.localStorage.setItem(storageKey, urlMode);
      return;
    }

    if (saved && saved !== initialLayout) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("layout", saved);
      const query = params.toString();
      setMode(saved);
      router.replace(`${pathname}${query ? `?${query}` : ""}#restaurant-list`, { scroll: false });
    }
  }, [initialLayout, pathname, router, searchParams, urlMode]);

  function toggleLayout() {
    window.localStorage.setItem(storageKey, nextMode);
    setMode(nextMode);
    router.replace(nextHref, { scroll: false });
  }

  return (
    <button
      aria-label={activeMode === "grid" ? "Показать крупные карточки" : "Показать сеткой"}
      className="catalog-layout-toggle"
      title={activeMode === "grid" ? "Показать крупные карточки" : "Показать сеткой"}
      type="button"
      onClick={toggleLayout}
    >
      {activeMode === "grid" ? <Rows3 size={20} aria-hidden /> : <Grid2X2 size={20} aria-hidden />}
    </button>
  );
}
