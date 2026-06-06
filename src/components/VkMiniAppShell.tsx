"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, Home, Info, UtensilsCrossed } from "lucide-react";
import { BrandLogoMark } from "@/components/BrandLogo";
import { useVkMiniApp } from "@/hooks/useVkMiniApp";

type Props = {
  active?: "home" | "bookings" | "info";
  children: ReactNode;
};

export function VkMiniAppShell({ active = "home", children }: Props) {
  const vkMini = useVkMiniApp();

  return (
    <div className="vk-mini-layout">
      <header className="vk-mini-topbar">
        <Link className="vk-mini-brand" href="/vk-mini" aria-label="Kaifbook">
          <BrandLogoMark />
          <span>Kaifbook</span>
        </Link>
        <span className={`vk-mini-runtime ${vkMini.inVkRuntime ? "is-vk" : ""}`}>
          {vkMini.ready ? (vkMini.inVkRuntime ? "VK Mini App" : "Браузер") : "Загрузка"}
        </span>
      </header>

      {vkMini.error && !vkMini.inVkRuntime ? <p className="vk-mini-note">{vkMini.error}</p> : null}

      <main className="vk-mini-main">{children}</main>

      <nav className="vk-mini-bottom-nav" aria-label="Навигация VK Mini App">
        <Link className={active === "home" ? "active" : ""} href="/vk-mini">
          <Home size={20} aria-hidden />
          <span>Каталог</span>
        </Link>
        <Link className={active === "bookings" ? "active" : ""} href="/vk-mini/bookings">
          <CalendarCheck size={20} aria-hidden />
          <span>Брони</span>
        </Link>
        <Link className={active === "info" ? "active" : ""} href="/terms">
          <Info size={20} aria-hidden />
          <span>Правила</span>
        </Link>
        <Link href="/restaurants">
          <UtensilsCrossed size={20} aria-hidden />
          <span>Сайт</span>
        </Link>
      </nav>
    </div>
  );
}
