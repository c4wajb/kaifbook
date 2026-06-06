"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ChipSlider({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  function scroll(dir: number) {
    trackRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  const wrapperCls = [
    "chip-slider-wrapper",
    canScrollLeft ? "has-scroll-left" : "",
    canScrollRight ? "has-scroll-right" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperCls}>
      {canScrollLeft && (
        <button className="chip-slider-arrow chip-slider-arrow-left" onClick={() => scroll(-1)} aria-label="Влево">
          <ChevronLeft size={20} />
        </button>
      )}
      <div ref={trackRef} className={`chip-slider-track ${className}`}>
        {children}
      </div>
      {canScrollRight && (
        <button className="chip-slider-arrow chip-slider-arrow-right" onClick={() => scroll(1)} aria-label="Вправо">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
