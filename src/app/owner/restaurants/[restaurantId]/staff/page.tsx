import { notFound } from "next/navigation";
import { OwnerTabs } from "@/components/admin/OwnerTabs";
import { RestaurantVkNotify } from "@/components/vk/RestaurantVkNotify";
import { StaffManager } from "@/components/admin/StaffManager";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { canManageRestaurant } from "@/lib/permissions";
import { requireOwnerPageUser } from "@/lib/page-auth";

type Props = { params: Promise<{ restaurantId: string }> };

export default async function StaffPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) notFound();

  const staffAccesses = await prisma.restaurantStaffAccess.findMany({
    where: { restaurantId },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Управление персоналом</p>
        <h1>{restaurant.title}</h1>
        <p>Добавляйте официантов и менеджеров. Они смогут управлять бронями, видеть список гостей и меню.</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} />

      <RestaurantVkNotify restaurantId={restaurant.id} initialPeerId={restaurant.vkNotifyPeerId} initialName={restaurant.vkNotifyName} />

      <section className="panel">
        <div className="section-heading">
          <h2>Сотрудники</h2>
        </div>
        {staffAccesses.length > 0 ? (
          <div className="staff-list">
            {staffAccesses.map((sa) => (
              <div className="staff-row" key={sa.id}>
                <div className="staff-info">
                  <strong>{sa.user.fullName}</strong>
                  <span>{sa.user.email}</span>
                  {sa.user.phone && <span>{sa.user.phone}</span>}
                </div>
                <span className="badge">{ROLE_LABELS[sa.role] || sa.role}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Сотрудники не добавлены. Добавьте официанта или менеджера.</div>
        )}
      </section>

      <StaffManager restaurantId={restaurant.id} initialStaff={staffAccesses.map((sa) => ({ id: sa.id, role: sa.role, user: sa.user }))} />
    </div>
  );
}
