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

  // Show both arrows whenever the row overflows, disabling the side that can't
  // scroll. This reserves the side gutters so the chips don't shift as you
  // scroll. When everything fits, no arrows render and the row is full width.
  const overflowing = canScrollLeft || canScrollRight;

  return (
    <div className={wrapperCls}>
      {overflowing && (
        <button
          className="chip-slider-arrow chip-slider-arrow-left"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          aria-label="Прокрутить влево"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div ref={trackRef} className={`chip-slider-track ${className}`}>
        {children}
      </div>
      {overflowing && (
        <button
          className="chip-slider-arrow chip-slider-arrow-right"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          aria-label="Прокрутить вправо"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
