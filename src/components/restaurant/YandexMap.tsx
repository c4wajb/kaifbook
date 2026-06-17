"use client";

import { Copy, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type YandexMapProps = {
  title: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  yandexOrgId?: string | null;
};

export function YandexMap({ title, city, address, latitude, longitude, yandexOrgId }: YandexMapProps) {
  const [copied, setCopied] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const addressText = useMemo(() => `${city}, ${address}`.trim(), [address, city]);

  // Load the heavy Yandex map widget only when the block is about to enter the
  // viewport (or on click). Visitors who never scroll to "Как добраться" don't
  // pay for the third-party script at all.
  useEffect(() => {
    if (mapVisible) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setMapVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mapVisible]);

  const hasCoords = latitude != null && longitude != null;

  const mapUrl = useMemo(() => {
    if (hasCoords && yandexOrgId) {
      const orgUri = encodeURIComponent(`ymapsbm1://org?oid=${yandexOrgId}`);
      return `https://yandex.ru/map-widget/v1/?ll=${longitude}%2C${latitude}&z=17&mode=poi&poi%5Bpoint%5D=${longitude}%2C${latitude}&poi%5Buri%5D=${orgUri}`;
    }
    if (hasCoords) {
      return `https://yandex.ru/map-widget/v1/?ll=${longitude}%2C${latitude}&z=18&pt=${longitude},${latitude},pm2rdm`;
    }
    return `https://yandex.ru/map-widget/v1/?mode=search&text=${encodeURIComponent(`${addressText}, ${title}`)}&z=18`;
  }, [hasCoords, latitude, longitude, yandexOrgId, addressText, title]);

  const externalUrl = useMemo(() => {
    if (hasCoords && yandexOrgId) {
      const orgUri = encodeURIComponent(`ymapsbm1://org?oid=${yandexOrgId}`);
      return `https://yandex.ru/maps/?ll=${longitude}%2C${latitude}&z=17&mode=poi&poi%5Bpoint%5D=${longitude}%2C${latitude}&poi%5Buri%5D=${orgUri}`;
    }
    return `https://yandex.ru/maps/?mode=search&text=${encodeURIComponent(`${addressText}, ${title}`)}`;
  }, [hasCoords, latitude, longitude, yandexOrgId, addressText, title]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="yandex-map" ref={containerRef}>
      {mapVisible ? (
        <iframe
          allowFullScreen
          aria-label={`Карта Яндекс: ${title}`}
          className="yandex-map-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapUrl}
          title={`Как добраться до ${title}`}
        />
      ) : (
        <button
          type="button"
          className="yandex-map-frame yandex-map-placeholder"
          onClick={() => setMapVisible(true)}
          aria-label={`Показать карту: ${title}`}
        >
          <MapPin size={26} aria-hidden />
          <span>Показать карту</span>
        </button>
      )}
      <div className="map-address-card">
        <span className="map-card-icon">
          <MapPin size={18} aria-hidden />
        </span>
        <div>
          <strong>{address}</strong>
          <span>{city}</span>
        </div>
        <div className="map-card-actions">
          <button className="small-button" type="button" onClick={copyAddress}>
            <Copy size={14} aria-hidden />
            {copied ? "Скопировано" : "Скопировать адрес"}
          </button>
          <a className="small-button" href={externalUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden />
            Открыть
          </a>
        </div>
      </div>
    </div>
  );
}
