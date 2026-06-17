"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Header search. Desktop: an always-open field. Mobile: a lupa icon that
 * expands into a full-width field. Submits to /restaurants?q=… (the catalog
 * already filters on the `q` search param), so no shared client state needed.
 */
export function HeaderSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = inputRef.current?.value.trim() || "";
    router.push(query ? `/restaurants?q=${encodeURIComponent(query)}#restaurant-list` : "/restaurants");
    setOpen(false);
  }

  return (
    <form className={`header-search ${open ? "is-open" : ""}`} role="search" onSubmit={submit}>
      <button
        type="button"
        className="header-search-icon"
        aria-label="Поиск ресторана"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Search size={18} aria-hidden />
      </button>
      <input ref={inputRef} name="q" type="search" placeholder="Поиск ресторана" aria-label="Поиск ресторана" enterKeyHint="search" />
      <button type="button" className="header-search-close" aria-label="Закрыть поиск" onClick={() => setOpen(false)}>
        <X size={16} aria-hidden />
      </button>
    </form>
  );
}
