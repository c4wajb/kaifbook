import { notFound } from "next/navigation";
import { OwnerTabs } from "@/components/OwnerTabs";
import { getRestaurantAnalytics } from "@/lib/owner-analytics";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canManageRestaurant } from "@/lib/permissions";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ restaurantId: string }> };

export default async function RestaurantAnalyticsPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) notFound();

  const analytics = await getRestaurantAnalytics(restaurantId);
  const maxDailyGuests = Math.max(1, ...analytics.charts.reservationsByDay.map((item) => item.guests));
  const maxWeekdayGuests = Math.max(1, ...analytics.charts.weekdayLoad.map((item) => item.guests));
  const hasDailyData = analytics.charts.reservationsByDay.some((item) => item.guests > 0);
  const hasWeekdayData = analytics.charts.weekdayLoad.some((item) => item.guests > 0);

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Аналитика</p>
        <h1>{restaurant.title}</h1>
        <p>Показывает, какие дни и часы дают посадку, где проседает спрос и что можно улучшить.</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} />

      <section className="dashboard-grid">
        <div className="metric-card"><strong>{analytics.metrics.monthGuests}</strong><span>гостей за 30 дней</span></div>
        <div className="metric-card"><strong>{analytics.metrics.conversionRate}%</strong><span>подтверждение заявок</span></div>
        <div className="metric-card"><strong>{analytics.metrics.noShowRate}%</strong><span>процент неявок</span></div>
        <div className="metric-card"><strong>{analytics.metrics.averagePartySize}</strong><span>средний размер компании</span></div>
      </section>

      <section className="grid-layout two-columns">
        <div className="panel">
          <h2>Динамика гостей</h2>
          {hasDailyData ? (
            <div className="chart-list">
              {analytics.charts.reservationsByDay.map((item) => (
                <div className="chart-row" key={item.key}>
                  <span>{item.label}</span>
                  <div className="chart-bar"><span style={{ width: item.guests ? `${Math.max(4, (item.guests / maxDailyGuests) * 100)}%` : "0" }} /></div>
                  <strong>{item.guests}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Пока нет гостей за последние 14 дней — график появится после первых подтверждённых броней.</div>
          )}
        </div>

        <div className="panel">
          <h2>Загрузка по дням недели</h2>
          {hasWeekdayData ? (
            <div className="chart-list">
              {analytics.charts.weekdayLoad.map((item) => (
                <div className="chart-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="chart-bar"><span style={{ width: item.guests ? `${Math.max(4, (item.guests / maxWeekdayGuests) * 100)}%` : "0" }} /></div>
                  <strong>{item.guests}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Пока нет данных по дням недели — график появится после первых подтверждённых броней.</div>
          )}
        </div>
      </section>

      <section className="grid-layout two-columns">
        <div className="panel">
          <h2>Популярные слоты</h2>
          <div className="stack-list">
            {analytics.charts.popularSlots.map((slot) => <div className="admin-row" key={slot.slot}><strong>{slot.slot}</strong><span className="muted">{slot.count} броней</span></div>)}
            {!analytics.charts.popularSlots.length ? <div className="empty-state">Пока недостаточно подтвержденных броней.</div> : null}
          </div>
        </div>
        <div className="panel">
          <h2>Операционная сводка</h2>
          <div className="stack-list">
            <div className="admin-row"><strong>{analytics.metrics.bestDay}</strong><span className="muted">самый активный день</span></div>
            <div className="admin-row"><strong>{analytics.metrics.weakDay}</strong><span className="muted">самый спокойный день</span></div>
            <div className="admin-row"><strong>{analytics.metrics.busiestSlot}</strong><span className="muted">пиковое время</span></div>
            <div className="admin-row"><strong>{analytics.metrics.bookingClicks}</strong><span className="muted">кликов по бронированию</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
