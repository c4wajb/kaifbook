import { notFound } from "next/navigation";
import { OwnerTabs } from "@/components/OwnerTabs";
import { WorkingHoursForm } from "@/components/WorkingHoursForm";
import { prisma } from "@/lib/db";
import { canManageRestaurant } from "@/lib/permissions";
import { requireOwnerPageUser } from "@/lib/page-auth";
type Props = { params: Promise<{ restaurantId: string }> };
export default async function WorkingHoursPage({ params }: Props) { const user = await requireOwnerPageUser(); const { restaurantId } = await params; const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { workingHours: { orderBy: { dayOfWeek: "asc" } } } }); if (!restaurant || !canManageRestaurant(user, restaurant)) notFound(); return <div className="page owner-layout"><div className="page-title"><p className="eyebrow">Настройки ресторана</p><h1>{restaurant.title}</h1></div><OwnerTabs restaurantId={restaurant.id} /><WorkingHoursForm restaurantId={restaurant.id} workingHours={restaurant.workingHours} /></div>; }
