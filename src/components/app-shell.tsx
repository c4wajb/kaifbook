import Link from "next/link";
import { BarChart3, BriefcaseBusiness, LogOut, Megaphone, Sparkles, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";

type AppShellProps = {
  user: {
    fullName: string;
    email: string;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <span>AI Бизнес Ассистент</span>
        </Link>

        <nav className="nav" aria-label="Главная навигация">
          <Link href="/dashboard">
            <BarChart3 size={18} aria-hidden="true" />
            Dashboard
          </Link>
          <Link href="/businesses">
            <BriefcaseBusiness size={18} aria-hidden="true" />
            Бизнесы
          </Link>
          <Link href="/businesses">
            <Users size={18} aria-hidden="true" />
            Клиенты и заявки
          </Link>
          <Link href="/businesses">
            <Megaphone size={18} aria-hidden="true" />
            Акции и AI
          </Link>
        </nav>

        <div className="sidebar-user">
          <strong>{user.fullName}</strong>
          <div>{user.email}</div>
          <form action={logoutAction}>
            <button className="logout-button" type="submit">
              <LogOut size={18} aria-hidden="true" />
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
