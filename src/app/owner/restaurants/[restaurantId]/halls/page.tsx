import Link from "next/link";
import { notFound } from "next/navigation";
import { HallCreateForm } from "@/components/HallCreateForm";
import { HallEditor } from "@/components/HallEditor";
import { OwnerTabs } from "@/components/OwnerTabs";
import { prisma } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/constants";
import { canAccessRestaurant } from "@/lib/permissions";
import { requireOwnerPageUser } from "@/lib/page-auth";

type Props = { params: Promise<{ restaurantId: string }>; searchParams: Promise<{ hallId?: string }> };

export default async function HallsPage({ params, searchParams }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const { hallId } = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      tableTypes: { where: { isActive: true }, orderBy: { maxGuests: "asc" } },
      halls: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          tables: { include: { tableType: true }, orderBy: [{ y: "asc" }, { x: "asc" }] },
          objects: { orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  });
  if (!restaurant || !(await canAccessRestaurant(user, restaurant))) notFound();
  const isStaff = (STAFF_ROLES as readonly string[]).includes(user.role);
  const selectedHall = restaurant.halls.find((hall) => hall.id === hallId) ?? restaurant.halls[0];

  return (
    <div className="page owner-layout hall-editor-page">
      <div className="page-title">
        <p className="eyebrow">Схема зала</p>
        <h1>{restaurant.title}</h1>
        {!isStaff && <p>Настройте залы, столы, зоны и объекты интерьера. Столы участвуют в бронировании, а нейтральные объекты помогают гостю понять планировку.</p>}
      </div>
      <OwnerTabs restaurantId={restaurant.id} isStaff={isStaff} />
      {!isStaff && <HallCreateForm restaurantId={restaurant.id} />}
      {restaurant.halls.length > 1 ? (
        <nav className="tabs hall-editor-tabs">
          {restaurant.halls.map((hall) => (
            <Link className={selectedHall?.id === hall.id ? "active" : ""} key={hall.id} href={`/owner/restaurants/${restaurant.id}/halls?hallId=${hall.id}`}>
              {hall.title}
            </Link>
          ))}
        </nav>
      ) : null}
      {selectedHall ? <HallEditor key={selectedHall.id} hall={selectedHall} tableTypes={restaurant.tableTypes} /> : <div className="empty-state">{isStaff ? "Залы не настроены." : "Добавьте зал, чтобы открыть редактор схемы."}</div>}
    </div>
  );
}
