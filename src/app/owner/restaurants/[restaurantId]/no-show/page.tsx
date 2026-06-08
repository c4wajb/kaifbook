import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { OwnerTabs } from "@/components/OwnerTabs";
import { prisma } from "@/lib/db";
import { formatGuests } from "@/lib/format";
import { getNoShowDepositAnalytics } from "@/lib/no-show-analytics";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canManageRestaurant } from "@/lib/permissions";
import { createReservation } from "@/lib/reservations";

type Props = { params: Promise<{ restaurantId: string }> };

async function createReservationFromWaitlist(restaurantId: string, entryId: string) {
  "use server";
  const user = await requireOwnerPageUser();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) throw new Error("Access denied");
  const entry = await prisma.waitlistEntry.findFirst({ where: { id: entryId, restaurantId, status: "new" } });
  if (!entry) throw new Error("Waitlist entry not found");
  await createReservation(restaurantId, {
    customerName: entry.guestName,
    customerPhone: entry.guestPhone,
    guestsCount: entry.guestsCount,
    reservationDate: entry.desiredDate.toISOString().slice(0, 10),
    startTime: entry.desiredStartTime,
    endTime: entry.desiredEndTime,
    comment: entry.comment || "Создано из листа ожидания",
  });
  await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: "converted", notifiedAt: new Date() } });
  revalidatePath(`/owner/restaurants/${restaurantId}/no-show`);
}

export default async function NoShowAnalyticsPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) notFound();
  const analytics = await getNoShowDepositAnalytics(restaurantId);
  const waitlist = await prisma.waitlistEntry.findMany({ where: { restaurantId, status: "new" }, include: { preferredTableType: true }, orderBy: { createdAt: "desc" }, take: 8 });
  const metrics = analytics.metrics;

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Неявки и депозиты</p>
        <h1>{restaurant.title}</h1>
        <p>Сравните, как подтверждение по ссылке и депозит влияют на пустые посадки. Эти цифры помогают объяснить правила менеджеру и гостям.</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} />

      <section className="metric-grid">
        <div className="metric-card"><strong>{metrics.totalReservations}</strong><span>Всего броней</span></div>
        <div className="metric-card"><strong>{metrics.noShowRate}%</strong><span>no-show rate</span></div>
        <div className="metric-card"><strong>{metrics.smallTableNoShowRate}%</strong><span>Неявки по маленьким столам</span></div>
        <div className="metric-card"><strong>{metrics.largeTableNoShowRate}%</strong><span>Неявки по большим столам</span></div>
        <div className="metric-card"><strong>{metrics.depositReservations}</strong><span>Броней с депозитом</span></div>
        <div className="metric-card"><strong>{metrics.paidDeposits}</strong><span>Оплаченных депозитов</span></div>
        <div className="metric-card"><strong>{metrics.expiredPayments}</strong><span>Истекших оплат</span></div>
        <div className="metric-card"><strong>{metrics.awaitingPayment}</strong><span>Ожидают оплату</span></div>
        <div className="metric-card"><strong>{metrics.guestConfirmed}</strong><span>Подтверждено гостем</span></div>
        <div className="metric-card"><strong>{metrics.cancelledAhead}</strong><span>Отменено заранее</span></div>
      </section>

      <section>
        <div className="panel">
          <h2>Сравнение риска</h2>
          <div className="stack-list">
            <div className="insight-row"><strong>С подтверждением</strong><span>{metrics.noShowWithConfirmation}% no-show</span></div>
            <div className="insight-row"><strong>Без подтверждения</strong><span>{metrics.noShowWithoutConfirmation}% no-show</span></div>
            <div className="insight-row"><strong>С депозитом</strong><span>{metrics.noShowWithDeposit}% no-show</span></div>
            <div className="insight-row"><strong>Без депозита</strong><span>{metrics.noShowWithoutDeposit}% no-show</span></div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact-heading">
          <div>
            <h2>Лист ожидания</h2>
            <p>Если депозитная оплата истекла или гость отменил бронь, менеджер может быстро заменить посадку человеком из листа ожидания.</p>
          </div>
        </div>
        <div className="stack-list">
          {waitlist.map((entry) => (
            <div className="reservation-row" key={entry.id}>
              <div>
                <strong>{entry.guestName} · {formatGuests(entry.guestsCount)}</strong>
                <p>{entry.desiredDate.toLocaleDateString("ru-RU")} {entry.desiredStartTime}-{entry.desiredEndTime || ""}{entry.preferredTableType ? ` · ${entry.preferredTableType.title}` : ""}</p>
                {entry.comment ? <p>{entry.comment}</p> : null}
              </div>
              <form action={createReservationFromWaitlist.bind(null, restaurant.id, entry.id)}>
                <button className="small-button" type="submit">Создать бронь</button>
              </form>
            </div>
          ))}
          {!waitlist.length ? <div className="empty-state">Лист ожидания пуст.</div> : null}
        </div>
      </section>
    </div>
  );
}
