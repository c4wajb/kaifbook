import Link from "next/link";
import { requireAdminPageUser } from "@/lib/page-auth";

export default async function AdminPage() {
  await requireAdminPageUser("/admin");

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">Админ-панель</p>
        <h1>Управление платформой</h1>
      </div>
      <section className="dashboard-grid">
        <Link className="metric-card" href="/admin/leads">
          <strong>Заявки ресторанов</strong>
          <span>подключение заведений</span>
        </Link>
        <Link className="metric-card" href="/admin/restaurants">
          <strong>Рестораны</strong>
          <span>модерация</span>
        </Link>
        <Link className="metric-card" href="/admin/users">
          <strong>Пользователи</strong>
          <span>роли и доступы</span>
        </Link>
        <Link className="metric-card" href="/admin/reservations">
          <strong>Брони</strong>
          <span>все заявки</span>
        </Link>
        <Link className="metric-card" href="/admin/server">
          <strong>Сервер</strong>
          <span>мониторинг и здоровье</span>
        </Link>
      </section>
    </div>
  );
}
