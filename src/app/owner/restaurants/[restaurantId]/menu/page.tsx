import { notFound } from "next/navigation";
import { MenuManager } from "@/components/MenuManager";
import { OwnerTabs } from "@/components/OwnerTabs";
import { prisma } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/constants";
import { canAccessRestaurant } from "@/lib/permissions";
import { requireOwnerPageUser } from "@/lib/page-auth";
type Props = { params: Promise<{ restaurantId: string }> };
export default async function MenuPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { menuCategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } } } } });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();
  const isStaff = (STAFF_ROLES as readonly string[]).includes(user.role);
  return <div className="page owner-layout"><div className="page-title"><p className="eyebrow">Настройки ресторана</p><h1>{restaurant.title}</h1></div><OwnerTabs restaurantId={restaurant.id} isStaff={isStaff} /><MenuManager restaurantId={restaurant.id} categories={restaurant.menuCategories} /></div>;
}
