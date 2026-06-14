import Link from "next/link";
import { headers } from "next/headers";
import { CalendarCheck, Code, LayoutDashboard, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";
import { OWNER_ROLES, ROLES, STAFF_ROLES } from "@/lib/constants";

export async function AppHeader() {
  const user = await getCurrentUser();
  const headerStore = await headers();
  const pathname = headerStore.get("x-current-path") || "/";
  if (pathname.startsWith("/vk-mini")) return null;

  const host = headerStore.get("host") || "";
  const isStolix = host.includes("stolix");

  const isOwner = user && (OWNER_ROLES as readonly string[]).includes(user.role);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isStaff = user && (STAFF_ROLES as readonly string[]).includes(user.role);
  const isOffice = pathname.startsWith("/owner") || pathname.startsWith("/admin");
  // On the login page itself a header "Войти" just links back to the same page,
  // which is confusing next to the real form button — so hide it there.
  const isLoginPage = pathname.startsWith("/owner/login") || pathname.startsWith("/admin/login");

  if (isOffice) {
    return (
      <header className="app-header office-header">
        <Link className="brand" href={isAdmin ? "/admin" : "/owner/dashboard"}>
          <BrandLogo office isStolix={isStolix} />
        </Link>
        <nav className="main-nav" aria-label="Служебная навигация">
          {isOwner ? (
            <>
              <Link className="icon-text" href="/owner/dashboard">
                <LayoutDashboard size={16} aria-hidden /> Кабинет
              </Link>
              <Link href="/owner/restaurants">Рестораны</Link>
            </>
          ) : null}
          {isAdmin ? (
            <Link className="icon-text" href="/admin">
              <ShieldCheck size={16} aria-hidden /> Админка
            </Link>
          ) : null}
          {isStolix && isAdmin ? (
            <>
              <Link className="icon-text" href="/server">
                <ShieldCheck size={16} aria-hidden /> Сервер
              </Link>
              <Link className="icon-text" href="/stolix/api-docs">
                <Code size={16} aria-hidden /> API
              </Link>
            </>
          ) : null}
          {isAdmin ? (
            <Link className="icon-text" href="/admin/api-docs">
              <Code size={16} aria-hidden /> API
            </Link>
          ) : null}
          <Link href="https://www.kaifbook.ru/restaurants">{isStolix ? "Kaifbook" : "Клиентский сайт"}</Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip">
                <CalendarCheck size={14} aria-hidden />
                {user.fullName}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              {!isLoginPage && <Link className="ghost" href="/owner/login">Войти</Link>}
              {!isStolix && !isStaff && <Link className="button compact" href="/owner/register">Подключить ресторан</Link>}
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="app-header public-header">
      <Link className="brand" href="/">
        <BrandLogo />
      </Link>
      <nav className="main-nav" aria-label="Главная навигация">
        <Link href="/guest/reservations">Мои брони</Link>
      </nav>
      <div className="header-actions" aria-hidden="true" />
    </header>
  );
}
