"use client";

import { Download, Maximize2, QrCode, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

type ReservationQrCardProps = {
  qrUrl?: string | null;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

function downloadHref(qrUrl: string) {
  return qrUrl.includes("?") ? `${qrUrl}&download=1` : `${qrUrl}?download=1`;
}

export function ReservationQrCard({
  qrUrl,
  title = "QR-код брони",
  description = "Покажите QR-код сотруднику ресторана. В нем есть краткая информация о визите: стол, места, имя и телефон.",
  compact = false,
  className = "",
}: ReservationQrCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!qrUrl) return null;

  return (
    <div className={`reservation-qr-card ${compact ? "compact" : ""} ${className}`}>
      <div className="reservation-qr-copy">
        <span className="reservation-qr-icon">
          <QrCode size={18} aria-hidden />
        </span>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <button
        className="reservation-qr-image-wrap reservation-qr-image-button"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Открыть QR-код крупно"
      >
        <img src={qrUrl} alt={title} loading="lazy" />
        <span className="reservation-qr-zoom-hint">
          <Maximize2 size={14} aria-hidden />
          Открыть
        </span>
      </button>
      <div className="reservation-qr-actions">
        <button className="button reservation-qr-open" type="button" onClick={() => setIsOpen(true)}>
          <Maximize2 size={16} aria-hidden />
          Открыть крупно
        </button>
        <a className="secondary-button reservation-qr-download" href={downloadHref(qrUrl)} download>
          <Download size={16} aria-hidden />
          Скачать QR
        </a>
      </div>
      {isOpen ? (
        <div
          className="reservation-qr-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onMouseDown={() => setIsOpen(false)}
        >
          <div className="reservation-qr-modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <button
              className="icon-button qr-modal-close"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть QR-код"
            >
              <X size={18} aria-hidden />
            </button>
            <div className="reservation-qr-modal-head">
              <span className="reservation-qr-icon">
                <QrCode size={20} aria-hidden />
              </span>
              <div>
                <h2 id={titleId}>{title}</h2>
                <p id={descriptionId}>
                  Покажите этот экран сотруднику ресторана. QR-код содержит краткие данные для проверки брони.
                </p>
              </div>
            </div>
            <div className="reservation-qr-modal-image">
              <img src={qrUrl} alt={title} />
            </div>
            <div className="reservation-qr-modal-actions">
              <a className="secondary-button reservation-qr-download" href={downloadHref(qrUrl)} download>
                <Download size={16} aria-hidden />
                Скачать QR
              </a>
              <button className="button" type="button" onClick={() => setIsOpen(false)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
