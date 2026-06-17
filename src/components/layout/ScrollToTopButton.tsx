"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const SCROLL_THRESHOLD = 500;

function isPublicClientPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/restaurants") || pathname.startsWith("/r/");
}

function hasOpenModal() {
  if (typeof document === "undefined") return false;
  return document.body.style.overflow === "hidden" || Boolean(document.querySelector('[aria-modal="true"], dialog[open]'));
}

export function ScrollToTopButton() {
  const pathname = usePathname();
  const enabled = useMemo(() => isPublicClientPath(pathname || "/"), [pathname]);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    const updateState = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
      setModalOpen(hasOpenModal());
    };

    updateState();
    window.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    const observer = new MutationObserver(updateState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <button
      aria-label="Вернуться наверх"
      className={`scroll-to-top-button ${visible && !modalOpen ? "is-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      type="button"
    >
      <ArrowUp size={23} aria-hidden />
    </button>
  );
}
