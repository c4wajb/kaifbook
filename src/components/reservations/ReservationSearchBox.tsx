"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export function ReservationSearchBox() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const debouncedQuery = useDebouncedValue(query);

  const normalizedQuery = useMemo(() => normalizeText(debouncedQuery), [debouncedQuery]);
  const queryDigits = useMemo(() => normalizePhone(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-reservation-card]"));
    let visible = 0;

    cards.forEach((card) => {
      const guestName = normalizeText(card.dataset.searchName || "");
      const guestPhone = normalizePhone(card.dataset.searchPhone || "");
      const nameMatch = normalizedQuery ? guestName.includes(normalizedQuery) : true;
      const phoneMatch = queryDigits.length > 0 && guestPhone.includes(queryDigits);
      const matches = !normalizedQuery || nameMatch || phoneMatch;

      card.hidden = !matches;
      if (matches) visible += 1;
    });

    setVisibleCount(visible);
  }, [normalizedQuery, queryDigits]);

  return (
    <div className="reservation-search-area">
      <label className="reservation-search-field">
        <span>Поиск</span>
        <div className="reservation-search-input">
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Поиск по гостю или телефону"
            type="search"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск">
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      </label>
      {debouncedQuery && visibleCount === 0 ? (
        <div className="empty-state reservation-search-empty">
          <strong>Брони не найдены</strong>
          <p>Попробуйте изменить запрос, статус или дату визита.</p>
        </div>
      ) : null}
    </div>
  );
}
