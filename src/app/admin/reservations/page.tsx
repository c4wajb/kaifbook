import { Badge } from "@/components/Badge";
import { prisma } from "@/lib/db";
import { reservationDateLabel } from "@/lib/format";
import { requireAdminPageUser } from "@/lib/page-auth";
export default async function AdminReservationsPage() { await requireAdminPageUser("/admin/reservations"); const reservations = await prisma.reservation.findMany({ include: { restaurant: true, hall: true, table: true }, orderBy: [{ reservationDate: "desc" }, { startTime: "asc" }] }); return <div className="page"><div className="page-title"><p className="eyebrow">Админ-панель</p><h1>Брони</h1></div><section className="panel reservation-list">{reservations.map((r) => <div className="reservation-row" key={r.id}><div><strong>{r.restaurant.title}: {r.customerName}</strong><p>{reservationDateLabel(r.reservationDate)} {r.startTime}-{r.endTime} · {r.guestsCount} гост.</p><p>{r.customerPhone}{r.table ? ` · стол ${r.table.number}` : ""}</p></div><Badge status={r.status} /></div>)}</section></div>; }
