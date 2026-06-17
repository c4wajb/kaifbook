"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type RestaurantCardGalleryProps = {
  images: string[];
  restaurantName: string;
  autoplayActive?: boolean;
  className?: string;
  intervalMs?: number;
  priority?: boolean;
};

const fallbackPhoto = "/images/stock/restaurants/dining-01.jpg";

function uniqueImages(images: string[], brokenImages: string[]) {
  return images
    .map((image) => image.trim())
    .filter(Boolean)
    .filter((image) => !brokenImages.includes(image))
    .filter((image, index, list) => list.indexOf(image) === index)
    .slice(0, 5);
}

export function RestaurantCardGallery({
  images,
  restaurantName,
  autoplayActive = false,
  className = "",
  intervalMs = 1500,
  priority = false,
}: RestaurantCardGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<string[]>([]);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const skipNextClick = useRef(false);
  const galleryImages = useMemo(() => uniqueImages(images, brokenImages), [brokenImages, images]);
  const visibleImages = galleryImages.length ? galleryImages : [fallbackPhoto];
  const hasGallery = galleryImages.length > 1;

  useEffect(() => {
    if (!autoplayActive || !hasGallery) {
      setActiveIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleImages.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [autoplayActive, hasGallery, intervalMs, visibleImages.length]);

  useEffect(() => {
    if (activeIndex >= visibleImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleImages.length]);

  function moveImage(direction: number) {
    setActiveIndex((current) => (current + direction + visibleImages.length) % visibleImages.length);
  }

  function startSwipe(event: React.PointerEvent<HTMLSpanElement>) {
    if (event.pointerType === "mouse" || !hasGallery) return;
    swipeStartX.current = event.clientX;
    swipeStartY.current = event.clientY;
  }

  function finishSwipe(event: React.PointerEvent<HTMLSpanElement>) {
    if (swipeStartX.current === null || swipeStartY.current === null) return;

    const deltaX = event.clientX - swipeStartX.current;
    const deltaY = event.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    if (Math.abs(deltaX) < 34 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;

    event.preventDefault();
    event.stopPropagation();
    skipNextClick.current = true;
    moveImage(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      skipNextClick.current = false;
    }, 260);
  }

  function cancelSwipe() {
    swipeStartX.current = null;
    swipeStartY.current = null;
  }

  function handleGalleryClick(event: React.MouseEvent<HTMLSpanElement>) {
    if (!skipNextClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    skipNextClick.current = false;
  }

  return (
    <span
      className={`restaurant-card-gallery ${className}`}
      aria-label={`Фото ресторана ${restaurantName}`}
      onClick={handleGalleryClick}
      onPointerCancel={cancelSwipe}
      onPointerDown={startSwipe}
      onPointerUp={finishSwipe}
    >
      {visibleImages.map((image, index) => (
        <span
          className={`restaurant-card-gallery-layer ${index === activeIndex ? "is-active" : ""}`}
          key={`${image}-${index}`}
          aria-hidden={index !== activeIndex}
        >
          <Image
            src={image}
            alt={`Фото ресторана ${restaurantName}`}
            width={900}
            height={560}
            sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 25vw"
            className="restaurant-card-gallery-image"
            draggable={false}
            onError={() => {
              if (image === fallbackPhoto) return;
              setBrokenImages((current) => (current.includes(image) ? current : [...current, image]));
            }}
            priority={priority && index === 0}
          />
        </span>
      ))}

      {hasGallery ? (
        <span className="restaurant-card-photo-dots" aria-hidden>
          {visibleImages.map((_, index) => (
            <span className={index === activeIndex ? "active" : ""} key={index} />
          ))}
        </span>
      ) : null}
    </span>
  );
}
