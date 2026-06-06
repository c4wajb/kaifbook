import Link from "next/link";
import { BarChart3, CalendarClock, Plus, Settings, Users } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ROLES, STAFF_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatList, formatMoney } from "@/lib/format";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { getStaffRestaurantIds } from "@/lib/permissions";

export default async function OwnerRestaurantsPage() {
  const user = await requireOwnerPageUser("/owner/restaurants");
  const isStaff = (STAFF_ROLES as readonly string[]).includes(user.role);
  const staffRestaurantIds = isStaff ? await getStaffRestaurantIds(user.id) : [];
  const restaurants = await prisma.restaurant.findMany({
    where: user.role === ROLES.ADMIN ? {} : isStaff ? { id: { in: staffRestaurantIds } } : { ownerId: user.id },
    include: { _count: { select: { reservations: true, tables: true, menuItems: true, guests: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="page owner-layout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kaifbook Office</p>
          <h1>{isStaff ? "Рестораны" : "Мои рестораны"}</h1>
        </div>
        {!isStaff && (
          <Link className="button icon-text" href="/owner/restaurants/new">
            <Plus size={17} aria-hidden />Добавить ресторан
          </Link>
        )}
      </div>

      <section className="panel restaurant-admin-list">
        {restaurants.map((restaurant) => (
          <article className="restaurant-admin-row" key={restaurant.id}>
            <Link className="restaurant-admin-main restaurant-admin-link" href={`/owner/restaurants/${restaurant.id}/${isStaff ? "reservations" : "edit"}`}>
              <strong>{restaurant.title}</strong>
              <span>{restaurant.city}, {restaurant.address}</span>
              <span>{formatList(restaurant.cuisineTypes) || "Кухня не указана"} · {formatMoney(restaurant.averageCheck)}</span>
            </Link>

            <Badge status={restaurant.status} />

            <div className="restaurant-admin-stat">
              <strong>{restaurant._count.reservations}</strong>
              <span>броней</span>
            </div>
            <div className="restaurant-admin-stat">
              <strong>{restaurant._count.guests}</strong>
              <span>гостей</span>
            </div>

            <div className="restaurant-admin-actions">
              <Link className="small-button icon-text" href={`/owner/restaurants/${restaurant.id}/reservations`}>
                <CalendarClock size={15} aria-hidden />Брони
              </Link>
              <Link className="small-button icon-text" href={`/owner/restaurants/${restaurant.id}/guests`}>
                <Users size={15} aria-hidden />Гости
              </Link>
              {!isStaff && (
                <>
                  <Link className="small-button icon-text" href={`/owner/restaurants/${restaurant.id}/analytics`}>
                    <BarChart3 size={15} aria-hidden />Аналитика
                  </Link>
                  <Link className="small-button icon-text" href={`/owner/restaurants/${restaurant.id}/edit`}>
                    <Settings size={15} aria-hidden />Описание
                  </Link>
                </>
              )}
            </div>
          </article>
        ))}
        {!restaurants.length ? <div className="empty-state">Добавьте первый ресторан, чтобы начать принимать брони и собирать базу гостей.</div> : null}
      </section>
    </div>
  );
}
