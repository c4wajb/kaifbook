import Link from "next/link";
import { CalendarClock, ChefHat, LayoutGrid, History, Users } from "lucide-react";
import { STAFF_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canAccessRestaurant } from "@/lib/permissions";

type Props = {
  params: Promise<{ restaurantId: string }>;
  children: React.ReactNode;
};

const WAITER_NAV = [
  { label: "Брони", icon: CalendarClock, segment: "reservations" },
  { label: "Гости", icon: Users, segment: "guests" },
  { label: "История броней", icon: History, segment: "reservation-history" },
  { label: "Меню", icon: ChefHat, segment: "menu" },
  { label: "Схема зала", icon: LayoutGrid, segment: "halls" },
] as const;

export default async function RestaurantLayout({ params, children }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const isStaff = (STAFF_ROLES as readonly string[]).includes(user.role);

  if (!isStaff) return <>{children}</>;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, title: true, ownerId: true },
  });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) return <>{children}</>;

  return (
    <div className="waiter-shell">
      <aside className="waiter-sidebar">
        <div className="waiter-sidebar-header">
          <strong>{restaurant.title}</strong>
          <span>Официант</span>
        </div>
        <nav className="waiter-nav">
          {WAITER_NAV.map(({ label, icon: Icon, segment }) => (
            <Link key={segment} href={`/owner/restaurants/${restaurant.id}/${segment}`}>
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="waiter-main">{children}</main>
    </div>
  );
}
