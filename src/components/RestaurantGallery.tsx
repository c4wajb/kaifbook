"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function RestaurantGallery({ title, photos }: { title: string; photos: string[] }) {
  const images = useMemo(() => photos.filter(Boolean).filter((photo, index, list) => list.indexOf(photo) === index), [photos]);
  const [active, setActive] = useState<number | null>(null);
  const activePhoto = active === null ? null : images[active];

  useEffect(() => {
    if (active === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowLeft") setActive((value) => (value === null ? value : (value - 1 + images.length) % images.length));
      if (event.key === "ArrowRight") setActive((value) => (value === null ? value : (value + 1) % images.length));
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, images.length]);

  if (!images.length) return null;

  return (
    <>
      <div className={`profile-gallery enhanced-gallery gallery-count-${Math.min(images.length, 6)}`}>
        {images.slice(0, 6).map((photo, index) => (
          <button className="gallery-item gallery-tile" key={`${photo}-${index}`} type="button" onClick={() => setActive(index)}>
            <Image src={photo} alt={`${title}: фото ${index + 1}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw" />
          </button>
        ))}
      </div>

      {activePhoto ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`Фото ресторана ${title}`} onClick={() => setActive(null)}>
          <button className="lightbox-close" type="button" aria-label="Закрыть фото" onClick={() => setActive(null)}>
            <X size={22} aria-hidden />
          </button>

          {images.length > 1 ? (
            <button
              className="lightbox-arrow left"
              type="button"
              aria-label="Предыдущее фото"
              onClick={(event) => {
                event.stopPropagation();
                setActive((value) => (value === null ? value : (value - 1 + images.length) % images.length));
              }}
            >
              <ChevronLeft size={28} aria-hidden />
            </button>
          ) : null}

          <div className="lightbox-image" onClick={(event) => event.stopPropagation()}>
            <Image src={activePhoto} alt={`${title}: увеличенное фото`} fill sizes="100vw" />
          </div>

          {images.length > 1 ? (
            <button
              className="lightbox-arrow right"
              type="button"
              aria-label="Следующее фото"
              onClick={(event) => {
                event.stopPropagation();
                setActive((value) => (value === null ? value : (value + 1) % images.length));
              }}
            >
              <ChevronRight size={28} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
