"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "kaifbook_cookie_consent";

export function CookieConsent() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Storage unavailable (private mode etc.) — show once per page load.
      setVisible(true);
    }
  }, []);

  // The VK Mini App runs embedded inside VK — no banner there.
  if (pathname.startsWith("/vk-mini") || !visible) return null;

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore — banner still hides for this session
    }
    setVisible(false);
  }

  return (
    <div className="cookie-consent" role="region" aria-label="Уведомление об использовании cookie">
      <p>
        Мы используем cookie, чтобы вы могли входить в аккаунт и бронировать столы. Оставаясь на
        сайте, вы соглашаетесь с <Link href="/privacy">политикой конфиденциальности</Link>.
      </p>
      <button type="button" className="button" onClick={accept}>
        Понятно
      </button>
    </div>
  );
}
