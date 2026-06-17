"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogLayoutToggle } from "@/components/restaurant/CatalogLayoutToggle";
import { CUISINE_TYPES, RESTAURANT_FEATURES } from "@/lib/constants";

type FilterValues = {
  q?: string;
  city?: string;
  cuisine?: string;
  feature?: string;
  averageCheck?: string;
  type?: string;
  open?: string;
};

type Props = {
  values?: FilterValues;
  cities: string[];
  layoutMode?: "grid" | "large";
  basePath?: string;
};

type Option = {
  label: string;
  value: string;
};

type FilterDropdownProps = {
  title: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

const typeOptions: Option[] = [
  { label: "Любой тип", value: "" },
  { label: "Ресторан", value: "ресторан" },
  { label: "Кафе", value: "кафе" },
  { label: "Бар", value: "бар" },
  { label: "Кофейня", value: "кофейня" },
  { label: "Кальян-бар", value: "кальян" },
];

const openOptions: Option[] = [
  { label: "Любое время", value: "" },
  { label: "Открыто сейчас", value: "open" },
  { label: "Работает допоздна", value: "late" },
];

function selectedLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label || "";
}

function scrollToList() {
  window.setTimeout(() => document.getElementById("restaurant-list")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

function FilterDropdown({ title, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasValue = Boolean(value);
  const label = hasValue ? selectedLabel(options, value) : title;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`filter-dropdown catalog-filter-chip ${hasValue ? "has-value" : ""}`} ref={rootRef}>
      <button
        className={`filter-trigger catalog-filter-trigger ${open ? "open" : ""} ${hasValue ? "selected" : ""}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={hasValue ? `${title}: ${label}` : title}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open ? (
        <div className="filter-menu catalog-filter-menu" role="listbox" aria-label={title}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                className={`filter-option ${selected ? "selected" : ""}`}
                key={`${title}-${option.value || "all"}`}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="filter-radio-dot" />
                <span>{option.label}</span>
              </button>
            );
          })}
          <button className="filter-menu-close" type="button" onClick={() => setOpen(false)}>
            Закрыть
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RestaurantFilters({ values = {}, cities, layoutMode = "grid", basePath = "/restaurants" }: Props) {
  const router = useRouter();
  const searchReadyRef = useRef(false);
  const mobileFiltersOpenedAtRef = useRef(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    q: values.q || "",
    city: values.city || "",
    cuisine: values.cuisine || "",
    feature: values.feature || "",
    averageCheck: values.averageCheck || "",
    type: values.type || "",
    open: values.open || "",
  });

  useEffect(() => {
    setFilters({
      q: values.q || "",
      city: values.city || "",
      cuisine: values.cuisine || "",
      feature: values.feature || "",
      averageCheck: values.averageCheck || "",
      type: values.type || "",
      open: values.open || "",
    });
  }, [values.averageCheck, values.city, values.cuisine, values.feature, values.open, values.q, values.type]);

  const cityOptions = [{ label: "Любой район", value: "" }, ...cities.map((item) => ({ label: item, value: item }))].filter(
    (option, index, list) => list.findIndex((item) => item.label === option.label) === index,
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => key !== "q" && Boolean(value)).length;

  function applyFilters(nextFilters: FilterValues) {
    const normalized = {
      q: nextFilters.q?.trim() || "",
      city: nextFilters.city || "",
      cuisine: nextFilters.cuisine || "",
      feature: nextFilters.feature || "",
      averageCheck: nextFilters.averageCheck || "",
      type: nextFilters.type || "",
      open: nextFilters.open || "",
    };
    setFilters(normalized);

    const params = new URLSearchParams();
    if (normalized.q) params.set("q", normalized.q);
    if (normalized.city) params.set("city", normalized.city);
    if (normalized.cuisine) params.set("cuisine", normalized.cuisine);
    if (normalized.feature) params.set("feature", normalized.feature);
    if (normalized.averageCheck) params.set("averageCheck", normalized.averageCheck);
    if (normalized.type) params.set("type", normalized.type);
    if (normalized.open) params.set("open", normalized.open);

    const query = params.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}#restaurant-list`, { scroll: false });
    scrollToList();
  }

  useEffect(() => {
    if (!searchReadyRef.current) {
      searchReadyRef.current = true;
      return;
    }

    const nextQuery = filters.q?.trim() || "";
    if (nextQuery === (values.q || "")) return;
    const timer = window.setTimeout(() => applyFilters(filters), 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  function updateFilter(key: keyof FilterValues, value: string) {
    applyFilters({ ...filters, [key]: value });
  }

  function resetFilters() {
    applyFilters({});
    setMobileFiltersOpen(false);
  }

  function openMobileFilters() {
    mobileFiltersOpenedAtRef.current = Date.now();
    setMobileFiltersOpen(true);
  }

  function closeMobileFilters() {
    if (Date.now() - mobileFiltersOpenedAtRef.current < 320) return;
    setMobileFiltersOpen(false);
  }

  return (
    <nav className="catalog-filter-strip" aria-label="Фильтры ресторанов">
      <div className="catalog-search-field">
        <Search size={16} aria-hidden />
        <input
          type="search"
          value={filters.q || ""}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="Поиск ресторана по названию"
          aria-label="Поиск ресторана по названию"
        />
        {filters.q ? (
          <button type="button" aria-label="Очистить поиск" onClick={() => applyFilters({ ...filters, q: "" })}>
            <X size={15} aria-hidden />
          </button>
        ) : null}
      </div>

      <button className="catalog-mobile-filter-button" type="button" onClick={openMobileFilters} aria-label="Открыть фильтры">
        <SlidersHorizontal size={19} aria-hidden />
        <span className="catalog-filter-button-label">Фильтры</span>
        {activeFiltersCount ? <span className="catalog-filter-count">{activeFiltersCount}</span> : null}
      </button>

      <div className="catalog-layout-bar">
        <CatalogLayoutToggle initialLayout={layoutMode} />
      </div>

      {mobileFiltersOpen ? <button className="catalog-filter-backdrop" type="button" aria-label="Закрыть фильтры" onClick={closeMobileFilters} /> : null}

      <div className={`catalog-filter-controls ${mobileFiltersOpen ? "open" : ""}`} style={mobileFiltersOpen ? { transform: "translateY(0)" } : undefined}>
        <div className="catalog-filter-sheet-head">
          <div>
            <strong>Фильтры</strong>
            <span>Выберите параметры для каталога</span>
          </div>
          <button type="button" aria-label="Закрыть фильтры" onClick={closeMobileFilters}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <FilterDropdown title="Район" value={filters.city || ""} options={cityOptions} onChange={(value) => updateFilter("city", value)} />
        <FilterDropdown
          title="Кухня"
          value={filters.cuisine || ""}
          options={[{ label: "Любая кухня", value: "" }, ...CUISINE_TYPES.map((item) => ({ label: item, value: item }))]}
          onChange={(value) => updateFilter("cuisine", value)}
        />
        <FilterDropdown title="Тип заведения" value={filters.type || ""} options={typeOptions} onChange={(value) => updateFilter("type", value)} />
        <FilterDropdown
          title="Особенности"
          value={filters.feature || ""}
          options={[{ label: "Любые особенности", value: "" }, ...RESTAURANT_FEATURES.map((item) => ({ label: item, value: item }))]}
          onChange={(value) => updateFilter("feature", value)}
        />
        <FilterDropdown
          title="Средний чек"
          value={filters.averageCheck || ""}
          options={[
            { label: "Любой чек", value: "" },
            { label: "до 1 200 ₽", value: "1200" },
            { label: "до 1 800 ₽", value: "1800" },
            { label: "до 2 500 ₽", value: "2500" },
            { label: "до 4 000 ₽", value: "4000" },
          ]}
          onChange={(value) => updateFilter("averageCheck", value)}
        />
        <FilterDropdown title="Время работы" value={filters.open || ""} options={openOptions} onChange={(value) => updateFilter("open", value)} />

        <div className="catalog-filter-sheet-actions">
          {hasActiveFilters ? (
            <button className="catalog-filter-reset" type="button" onClick={resetFilters}>
              <X size={14} aria-hidden />
              Сбросить
            </button>
          ) : null}
          <button className="button" type="button" onClick={closeMobileFilters}>
            Применить
          </button>
        </div>
      </div>
    </nav>
  );
}
