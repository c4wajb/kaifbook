"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const officePathPrefixes = ["/owner", "/admin", "/dashboard", "/businesses", "/login", "/register"];

export function AppFooter() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/vk-mini")) return null;

  const isOffice = officePathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isPublicRestaurantCard = pathname.startsWith("/restaurants/") || /^\/r\/[^/]+\/book$/.test(pathname);

  if (isOffice || isPublicRestaurantCard) return null;

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <section className="footer-brand">
          <Link className="brand" href="/">
            <BrandLogo />
          </Link>
          <p>Городской сервис для выбора ресторанов, событий и бронирования столов в Курске.</p>
        </section>

        <nav className="footer-column" aria-label="Гостям">
          <h2>Гостям</h2>
          <Link href="/restaurants">Рестораны</Link>
          <Link href="/restaurants#booking">Бронирование</Link>
          <Link href="/#city-events">События скоро</Link>
        </nav>

        <section className="footer-column">
          <h2>Для ресторанов</h2>
          <p>Хотите подключить ресторан? Напишите нам, и мы расскажем условия подключения.</p>
          <Link href="/for-restaurants">Оставить заявку</Link>
        </section>

        <section className="footer-column footer-contacts">
          <h2>Контакты</h2>
          <a href="mailto:admin@kaifbook.ru">
            <Mail size={16} aria-hidden />
            admin@kaifbook.ru
          </a>
          <a href="tel:+70000000000">
            <Phone size={16} aria-hidden />
            +7 000 000-00-00
          </a>
          <span>
            <MapPin size={16} aria-hidden />
            Курск
          </span>
        </section>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Kaifbook</span>
        <span className="footer-legal-links">
          <Link href="/terms">Пользовательское соглашение</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
        </span>
      </div>
    </footer>
  );
}
