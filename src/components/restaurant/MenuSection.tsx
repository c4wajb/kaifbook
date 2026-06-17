"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Eye, FileText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type MenuItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  weight: string | null;
  photoUrl: string | null;
};

type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

type Props = {
  categories: MenuCategory[];
  restaurantSlug: string;
  restaurantTitle: string;
  menuPageHref: string;
};

const DISH_FALLBACK = "/images/stock/menu/dish-fallback.jpg";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

function DishCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  return (
    <article className="dish-card" onClick={() => onSelect(item)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onSelect(item); }}>
      <div className="dish-card-image">
        <Image
          src={item.photoUrl || DISH_FALLBACK}
          alt={item.title}
          fill
          sizes="(max-width: 760px) 72vw, 260px"
        />
      </div>
      <div className="dish-card-body">
        <strong>{item.title}</strong>
        <p>{item.description || "Позиция меню ресторана."}</p>
        <div className="dish-card-meta">
          {item.weight ? <span>{item.weight}</span> : <span>в наличии</span>}
          <b>{formatMoney(item.price)}</b>
        </div>
      </div>
    </article>
  );
}

function DishDetailModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="dish-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="dish-detail-close" onClick={onClose} aria-label="Закрыть" type="button">
          <X size={20} />
        </button>
        <div className="dish-detail-image">
          <Image
            src={item.photoUrl || DISH_FALLBACK}
            alt={item.title}
            fill
            sizes="(max-width: 680px) 100vw, 520px"
          />
        </div>
        <div className="dish-detail-body">
          <h3>{item.title}</h3>
          <p>{item.description || "Позиция меню ресторана."}</p>
          <div className="dish-detail-footer">
            {item.weight ? <span className="dish-detail-weight">{item.weight}</span> : null}
            <b className="dish-detail-price">{formatMoney(item.price)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuModal({ categories, onClose, onSelectDish }: { categories: MenuCategory[]; onClose: () => void; onSelectDish: (item: MenuItem) => void }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const current = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
        <div className="menu-modal-header">
          <h2>Полное меню</h2>
          <button className="menu-modal-close" onClick={onClose} aria-label="Закрыть" type="button">
            <X size={22} />
          </button>
        </div>
        <nav className="menu-modal-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={cat.id === activeCategory ? "is-active" : ""}
              onClick={() => setActiveCategory(cat.id)}
              type="button"
            >
              {cat.title}
              <span>{cat.items.length}</span>
            </button>
          ))}
        </nav>
        <div className="menu-modal-grid">
          {current?.items.map((item) => (
            <DishCard key={item.id} item={item} onSelect={onSelectDish} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PdfViewer({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-pdf-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="menu-modal-header">
          <h2>Меню (PDF)</h2>
          <button className="menu-modal-close" onClick={onClose} aria-label="Закрыть" type="button">
            <X size={22} />
          </button>
        </div>
        <iframe className="menu-pdf-iframe" src={src} title="Меню PDF" />
      </div>
    </div>
  );
}

export function MenuSection({ categories, restaurantSlug, restaurantTitle, menuPageHref }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const filledCategories = categories.filter((c) => c.items.length > 0);
  const [activeCatId, setActiveCatId] = useState(filledCategories[0]?.id ?? "");

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, activeCatId]);

  const scroll = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".dish-card")?.clientWidth ?? 260;
    el.scrollBy({ left: direction * (cardWidth + 16) * 2, behavior: "smooth" });
  };

  const switchCategory = (id: string) => {
    setActiveCatId(id);
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  };

  const activeCat = filledCategories.find((c) => c.id === activeCatId) ?? filledCategories[0];

  if (!filledCategories.length) {
    return (
      <div className="empty-state">Меню пока не добавлено. Ресторан сможет заполнить блюда в личном кабинете.</div>
    );
  }

  return (
    <>
      <div className="menu-section-heading">
        <button className="menu-section-title" onClick={() => setShowModal(true)} type="button">
          <span>Меню</span>
          <Eye size={18} className="menu-section-title-icon" />
        </button>
        <div className="menu-section-links">
          <a className="secondary-button menu-slider-link" href={menuPageHref}>
            Страница меню
          </a>
          <button className="secondary-button menu-slider-link" onClick={() => setShowPdf(true)} type="button">
            <FileText size={16} />
            Просмотр PDF
          </button>
        </div>
      </div>

      {filledCategories.length > 1 && (
        <nav className="menu-slider-tabs">
          {filledCategories.map((cat) => (
            <button
              key={cat.id}
              className={cat.id === activeCatId ? "is-active" : ""}
              onClick={() => switchCategory(cat.id)}
              type="button"
            >
              {cat.title}
              <span className="menu-slider-tab-count">{cat.items.length}</span>
            </button>
          ))}
        </nav>
      )}

      <div className={`menu-slider-wrapper${canScrollLeft ? ' has-scroll-left' : ''}${canScrollRight ? ' has-scroll-right' : ''}`}>
        {canScrollLeft && (
          <button className="menu-slider-arrow menu-slider-arrow-left" onClick={() => scroll(-1)} aria-label="Назад" type="button">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="menu-slider-track" ref={trackRef}>
          {activeCat?.items.map((item) => (
            <DishCard key={item.id} item={item} onSelect={setSelectedDish} />
          ))}
        </div>
        {canScrollRight && (
          <button className="menu-slider-arrow menu-slider-arrow-right" onClick={() => scroll(1)} aria-label="Вперед" type="button">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {showModal ? <MenuModal categories={filledCategories} onClose={() => setShowModal(false)} onSelectDish={setSelectedDish} /> : null}
      {showPdf ? <PdfViewer src={`/api/restaurants/${restaurantSlug}/menu-pdf`} onClose={() => setShowPdf(false)} /> : null}
      {selectedDish ? <DishDetailModal item={selectedDish} onClose={() => setSelectedDish(null)} /> : null}
    </>
  );
}
