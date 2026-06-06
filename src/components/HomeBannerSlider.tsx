"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatList, formatMoney } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";

type BannerRestaurant = {
  title: string;
  slug: string;
  shortDescription: string;
  address: string;
  averageCheck: number;
  cuisineTypes: string;
  mainPhotoUrl: string | null;
  galleryPhotos?: string | null;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  bannerImage?: string | null;
};

const fallbackPhoto = "/images/stock/restaurants/dining-01.jpg";

export function HomeBannerSlider({ restaurants }: { restaurants: BannerRestaurant[] }) {
  const router = useRouter();
  const slides = useMemo(() => restaurants.slice(0, 8), [restaurants]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const skipNextClick = useRef(false);
  const preparedSlides = useMemo(
    () =>
      slides.map((slide) => ({
        ...slide,
        image: slide.bannerImage || slide.mainPhotoUrl || parseStringList(slide.galleryPhotos || "[]")[0] || fallbackPhoto,
        titleText: slide.bannerTitle || slide.title,
        subtitleText: slide.bannerSubtitle || slide.shortDescription,
        cuisineLabel: formatList(slide.cuisineTypes).split(", ").slice(0, 2).join(" и "),
      })),
    [slides],
  );
  const current = preparedSlides[index] ?? preparedSlides[0];

  useEffect(() => {
    if (preparedSlides.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % preparedSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, preparedSlides.length]);

  if (!current) return null;

  function go(direction: number) {
    setIndex((value) => (value + direction + preparedSlides.length) % preparedSlides.length);
  }

  function openCurrentSlide() {
    router.push(`/restaurants/${current.slug}`);
  }

  function startSwipe(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || preparedSlides.length < 2) return;
    swipeStartX.current = event.clientX;
    swipeStartY.current = event.clientY;
    setPaused(true);
  }

  function finishSwipe(event: React.PointerEvent<HTMLElement>) {
    if (swipeStartX.current === null || swipeStartY.current === null) return;

    const deltaX = event.clientX - swipeStartX.current;
    const deltaY = event.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    setPaused(false);

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;

    event.preventDefault();
    event.stopPropagation();
    skipNextClick.current = true;
    go(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      skipNextClick.current = false;
    }, 260);
  }

  function cancelSwipe() {
    swipeStartX.current = null;
    swipeStartY.current = null;
    setPaused(false);
  }

  function handleShowcaseClick(event: React.MouseEvent<HTMLElement>) {
    if (skipNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      skipNextClick.current = false;
      return;
    }

    openCurrentSlide();
  }

  return (
    <section
      className="restaurant-showcase home-banner-slider"
      aria-roledescription="carousel"
      aria-label={`Открыть ресторан ${current.titleText}`}
      role="link"
      tabIndex={0}
      onBlur={() => setPaused(false)}
      onClick={handleShowcaseClick}
      onFocus={() => setPaused(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCurrentSlide();
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerCancel={cancelSwipe}
      onPointerDown={startSwipe}
      onPointerUp={finishSwipe}
    >
      <div className="banner-slide-stack" aria-hidden="true">
        {preparedSlides.map((slide, slideIndex) => (
          <div className={`banner-slide ${slideIndex === index ? "active" : ""}`} key={slide.slug}>
            <Image src={slide.image} alt="" fill priority={slideIndex === 0} loading={slideIndex === 0 ? "eager" : "lazy"} sizes="(max-width: 980px) 100vw, 1180px" />
          </div>
        ))}
      </div>
      <div className="showcase-overlay" />
      <div className="showcase-content banner-content-stack">
        {preparedSlides.map((slide, slideIndex) => (
          <div className={`banner-copy ${slideIndex === index ? "active" : ""}`} key={slide.slug} aria-hidden={slideIndex !== index}>
            <span>{slide.cuisineLabel}</span>
            <h2>{slide.titleText}</h2>
            <p>{slide.subtitleText}</p>
            <div className="showcase-meta">
              <span>
                <MapPin size={15} aria-hidden />
                {slide.address}
              </span>
              <span>Средний чек {formatMoney(slide.averageCheck)}</span>
            </div>
            <div className="hero-slide-actions">
              <Link className="button banner-secondary-cta" href={`/restaurants/${slide.slug}`} tabIndex={slideIndex === index ? 0 : -1} onClick={(event) => event.stopPropagation()}>
                Открыть ресторан
              </Link>
              <Link className="button client-cta" href={`/restaurants/${slide.slug}/reserve`} tabIndex={slideIndex === index ? 0 : -1} onClick={(event) => event.stopPropagation()}>
                Забронировать стол
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="banner-live-region" aria-live="polite" aria-atomic="true">
        <span>{current.titleText}</span>
      </div>
      {slides.length > 1 ? (
        <>
          <button className="banner-arrow left" type="button" aria-label="Предыдущий ресторан" onClick={(event) => { event.stopPropagation(); go(-1); }}>
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button className="banner-arrow right" type="button" aria-label="Следующий ресторан" onClick={(event) => { event.stopPropagation(); go(1); }}>
            <ChevronRight size={22} aria-hidden />
          </button>
          <div className="banner-dots" aria-label="Слайды баннера">
            {slides.map((slide, dotIndex) => (
              <button className={dotIndex === index ? "active" : ""} key={slide.slug} type="button" aria-label={`Показать ${slide.title}`} onClick={(event) => { event.stopPropagation(); setIndex(dotIndex); }} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
