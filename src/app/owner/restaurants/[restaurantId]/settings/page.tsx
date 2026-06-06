import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OwnerTabs } from "@/components/OwnerTabs";
import { DAY_LABELS, DEPOSIT_MODES, PAYMENT_MODES } from "@/lib/constants";
import { DEFAULT_EXTERNAL_PAYMENT_TERMS } from "@/lib/external-payments";
import { prisma } from "@/lib/db";
import { requireOwnerPageUser } from "@/lib/page-auth";
import { canManageRestaurant } from "@/lib/permissions";
import { bookingPricingRuleSchema, noShowSettingsSchema, reservationDepositSettingsSchema, reservationSettingsSchema, restaurantPaymentSettingsSchema, tableTypeSchema } from "@/lib/validation";

type Props = { params: Promise<{ restaurantId: string }> };

function valueOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function assertRestaurantAccess(restaurantId: string) {
  const user = await requireOwnerPageUser();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !canManageRestaurant(user, restaurant)) throw new Error("Access denied");
  return restaurant;
}

async function saveSettings(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = reservationSettingsSchema.parse({
    minGuests: formData.get("minGuests"),
    maxGuests: formData.get("maxGuests"),
    reservationDurationMinutes: formData.get("reservationDurationMinutes"),
    minAdvanceBookingMinutes: formData.get("minAdvanceBookingMinutes"),
    maxAdvanceBookingDays: formData.get("maxAdvanceBookingDays"),
    autoConfirmEnabled: formData.get("autoConfirmEnabled") === "on",
    allowTableSelection: formData.get("allowTableSelection") === "on",
    allowSeatSelection: formData.get("allowSeatSelection") === "on",
    reserveWholeTableWhenSeatsSelected: formData.get("reserveWholeTableWhenSeatsSelected") === "on",
    minSeatsSelection: formData.get("minSeatsSelection"),
    maxSeatsSelection: valueOrNull(formData, "maxSeatsSelection"),
    requirePhoneConfirmation: formData.get("requirePhoneConfirmation") === "on",
    bookingIntervalMinutes: formData.get("bookingIntervalMinutes"),
    cancellationPolicyText: valueOrNull(formData, "cancellationPolicyText"),
  });
  await prisma.reservationSettings.upsert({ where: { restaurantId }, update: payload, create: { restaurantId, ...payload } });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=booking`);
}

async function saveDepositSettings(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = reservationDepositSettingsSchema.parse({
    depositEnabled: formData.get("depositEnabled") === "on",
    depositMode: formData.get("depositMode"),
    defaultDepositAmount: formData.get("defaultDepositAmount"),
    requireDepositForLargeTables: formData.get("requireDepositForLargeTables") === "on",
    requireDepositForGuestsFrom: valueOrNull(formData, "requireDepositForGuestsFrom"),
    requireDepositForPeakHours: formData.get("requireDepositForPeakHours") === "on",
    requireDepositForHighRiskGuests: formData.get("requireDepositForHighRiskGuests") === "on",
    paymentTimeoutMinutes: formData.get("paymentTimeoutMinutes"),
    depositRefundPolicyText: valueOrNull(formData, "depositRefundPolicyText"),
    depositAccountingText: valueOrNull(formData, "depositAccountingText"),
    legalNoticeText: valueOrNull(formData, "legalNoticeText"),
    isActive: true,
  });
  await prisma.reservationDepositSettings.upsert({ where: { restaurantId }, update: payload, create: { restaurantId, ...payload } });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=deposit`);
}

async function savePaymentSettings(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = restaurantPaymentSettingsSchema.parse({
    paymentMode: formData.get("paymentMode"),
    externalDepositAmount: formData.get("externalDepositAmount"),
    externalPaymentUrl: valueOrNull(formData, "externalPaymentUrl"),
    paymentTermsText: valueOrNull(formData, "paymentTermsText"),
    isPaymentEnabled: formData.get("isPaymentEnabled") === "on",
    showDepositInfo: formData.get("showDepositInfo") === "on",
  });
  await prisma.restaurant.update({ where: { id: restaurantId }, data: payload });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=payment`);
}

async function saveNoShowSettings(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = noShowSettingsSchema.parse({
    reminderEnabled: formData.get("reminderEnabled") === "on",
    reminderHoursBefore: formData.get("reminderHoursBefore"),
    secondReminderEnabled: formData.get("secondReminderEnabled") === "on",
    secondReminderMinutesBefore: formData.get("secondReminderMinutesBefore"),
    requireGuestConfirmation: formData.get("requireGuestConfirmation") === "on",
    confirmationDeadlineMinutesBefore: formData.get("confirmationDeadlineMinutesBefore"),
    autoMarkAtRiskEnabled: formData.get("autoMarkAtRiskEnabled") === "on",
  });
  await prisma.noShowSettings.upsert({ where: { restaurantId }, update: payload, create: { restaurantId, ...payload } });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=noshow`);
}

async function createTableType(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = tableTypeSchema.parse({
    title: formData.get("title"),
    code: String(formData.get("code") || "").toLowerCase(),
    description: valueOrNull(formData, "description"),
    minGuests: formData.get("minGuests"),
    maxGuests: formData.get("maxGuests"),
    defaultDepositAmount: formData.get("defaultDepositAmount"),
    defaultBookingPrice: formData.get("defaultBookingPrice"),
    isDepositRequired: formData.get("isDepositRequired") === "on",
    isActive: true,
  });
  await prisma.tableType.upsert({ where: { restaurantId_code: { restaurantId, code: payload.code } }, update: payload, create: { restaurantId, ...payload } });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=type`);
}

async function createPricingRule(restaurantId: string, formData: FormData) {
  "use server";
  await assertRestaurantAccess(restaurantId);
  const payload = bookingPricingRuleSchema.parse({
    title: formData.get("title"),
    tableTypeId: valueOrNull(formData, "tableTypeId"),
    tableId: valueOrNull(formData, "tableId"),
    minGuests: valueOrNull(formData, "minGuests"),
    maxGuests: valueOrNull(formData, "maxGuests"),
    dayOfWeek: valueOrNull(formData, "dayOfWeek"),
    startTime: valueOrNull(formData, "startTime"),
    endTime: valueOrNull(formData, "endTime"),
    depositAmount: formData.get("depositAmount"),
    bookingPrice: formData.get("bookingPrice"),
    isDepositRequired: formData.get("isDepositRequired") === "on",
    priority: formData.get("priority"),
    isActive: true,
  });
  await prisma.bookingPricingRule.create({ data: { restaurantId, ...payload } });
  revalidatePath(`/owner/restaurants/${restaurantId}/settings`);
  redirect(`/owner/restaurants/${restaurantId}/settings?saved=rule`);
}

export default async function RestaurantSettingsPage({ params }: Props) {
  const user = await requireOwnerPageUser();
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      settings: true,
      depositSettings: true,
      noShowSettings: true,
      tableTypes: { orderBy: { maxGuests: "asc" } },
      bookingPricingRules: { where: { isActive: true }, include: { tableType: true, table: true }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }] },
      halls: { include: { tables: { include: { tableType: true }, orderBy: { number: "asc" } } } },
    },
  });
  if (!restaurant || !canManageRestaurant(user, restaurant)) notFound();

  const settings = restaurant.settings ?? {
    minGuests: 1,
    maxGuests: 12,
    reservationDurationMinutes: 120,
    minAdvanceBookingMinutes: 60,
    maxAdvanceBookingDays: 30,
    autoConfirmEnabled: false,
    allowTableSelection: true,
    allowSeatSelection: true,
    reserveWholeTableWhenSeatsSelected: true,
    minSeatsSelection: 1,
    maxSeatsSelection: null,
    requirePhoneConfirmation: false,
    bookingIntervalMinutes: 30,
    cancellationPolicyText: "",
  };
  const depositSettings = restaurant.depositSettings ?? {
    depositEnabled: false,
    depositMode: "disabled",
    defaultDepositAmount: 0,
    requireDepositForLargeTables: false,
    requireDepositForGuestsFrom: null,
    requireDepositForPeakHours: false,
    requireDepositForHighRiskGuests: false,
    paymentTimeoutMinutes: 20,
    depositRefundPolicyText: "",
    depositAccountingText: "",
    legalNoticeText: "",
  };
  const noShowSettings = restaurant.noShowSettings ?? {
    reminderEnabled: true,
    reminderHoursBefore: 24,
    secondReminderEnabled: true,
    secondReminderMinutesBefore: 120,
    requireGuestConfirmation: true,
    confirmationDeadlineMinutesBefore: 120,
    autoMarkAtRiskEnabled: true,
  };
  const bookingUrl = `/r/${restaurant.slug}/book`;
  const allTables = restaurant.halls.flatMap((hall) => hall.tables.map((table) => ({ ...table, hallTitle: hall.title })));

  return (
    <div className="page owner-layout">
      <div className="page-title">
        <p className="eyebrow">Правила бронирования и депозиты</p>
        <h1>{restaurant.title}</h1>
        <p>Настройте посадку, типы столов, депозит для больших компаний и подтверждение визита по ссылке. Гость видит условия до отправки заявки.</p>
      </div>
      <OwnerTabs restaurantId={restaurant.id} />

      <section className="grid-layout two-columns">
        <form className="panel stack-form" action={saveSettings.bind(null, restaurant.id)}>
          <h2>Базовые правила</h2>
          <div className="form-grid two">
            <label><span>Минимум гостей</span><input name="minGuests" type="number" min="1" defaultValue={settings.minGuests} /></label>
            <label><span>Максимум гостей</span><input name="maxGuests" type="number" min="1" defaultValue={settings.maxGuests} /></label>
            <label><span>Длительность брони, минут</span><input name="reservationDurationMinutes" type="number" min="30" step="15" defaultValue={settings.reservationDurationMinutes} /></label>
            <label><span>Интервал слотов, минут</span><input name="bookingIntervalMinutes" type="number" min="15" step="15" defaultValue={settings.bookingIntervalMinutes} /></label>
            <label><span>Минимум до визита, минут</span><input name="minAdvanceBookingMinutes" type="number" min="0" defaultValue={settings.minAdvanceBookingMinutes} /></label>
            <label><span>Дней вперед</span><input name="maxAdvanceBookingDays" type="number" min="1" defaultValue={settings.maxAdvanceBookingDays} /></label>
          </div>
          <label className="check-row"><input name="autoConfirmEnabled" type="checkbox" defaultChecked={settings.autoConfirmEnabled} />Автоматически подтверждать заявки</label>
          <label className="check-row"><input name="allowTableSelection" type="checkbox" defaultChecked={settings.allowTableSelection} />Разрешить выбор стола</label>
          <label className="check-row"><input name="allowSeatSelection" type="checkbox" defaultChecked={settings.allowSeatSelection} />Разрешить гостю выбирать места на схеме</label>
          <label className="check-row"><input name="reserveWholeTableWhenSeatsSelected" type="checkbox" defaultChecked={settings.reserveWholeTableWhenSeatsSelected} />При выборе мест закреплять весь стол</label>
          <div className="form-grid two">
            <label><span>Минимум выбранных мест</span><input name="minSeatsSelection" type="number" min="0" defaultValue={settings.minSeatsSelection} /></label>
            <label><span>Максимум выбранных мест</span><input name="maxSeatsSelection" type="number" min="1" defaultValue={settings.maxSeatsSelection ?? ""} placeholder="По вместимости стола" /></label>
          </div>
          <label className="check-row"><input name="requirePhoneConfirmation" type="checkbox" defaultChecked={settings.requirePhoneConfirmation} />Требовать подтверждение телефона</label>
          <label><span>Политика отмены</span><textarea name="cancellationPolicyText" rows={4} defaultValue={settings.cancellationPolicyText || ""} /></label>
          <button className="button" type="submit">Сохранить правила</button>
        </form>

        <form className="panel stack-form" action={savePaymentSettings.bind(null, restaurant.id)}>
          <h2>Оплата брони</h2>
          <p className="muted">Kaifbook не принимает оплату. Гость переходит по платежной ссылке ресторана, а сотрудник вручную отмечает оплату в заявке.</p>
          <label className="check-row"><input name="isPaymentEnabled" type="checkbox" defaultChecked={restaurant.isPaymentEnabled} />Включить оплату по ссылке ресторана</label>
          <label className="check-row"><input name="showDepositInfo" type="checkbox" defaultChecked={restaurant.showDepositInfo} />Показывать депозит гостям</label>
          <div className="form-grid two">
            <label>
              <span>Тип бронирования</span>
              <select name="paymentMode" defaultValue={restaurant.paymentMode}>
                <option value={PAYMENT_MODES.FREE}>Бесплатная бронь</option>
                <option value={PAYMENT_MODES.EXTERNAL_DEPOSIT}>Бронь с депозитом</option>
              </select>
            </label>
            <label><span>Сумма депозита, ₽</span><input name="externalDepositAmount" type="number" min="0" defaultValue={restaurant.externalDepositAmount} /></label>
          </div>
          <label><span>Платежная ссылка ресторана</span><input name="externalPaymentUrl" type="url" placeholder="https://..." defaultValue={restaurant.externalPaymentUrl || ""} /></label>
          <label><span>Условия оплаты</span><textarea name="paymentTermsText" rows={4} defaultValue={restaurant.paymentTermsText || DEFAULT_EXTERNAL_PAYMENT_TERMS} /></label>
          <button className="button" type="submit">Сохранить оплату</button>
        </form>

        <form className="panel stack-form" action={saveDepositSettings.bind(null, restaurant.id)}>
          <h2>Депозиты и защита от no-show</h2>
          <label className="check-row"><input name="depositEnabled" type="checkbox" defaultChecked={depositSettings.depositEnabled} />Включить депозиты</label>
          <div className="form-grid two">
            <label><span>Режим</span><select name="depositMode" defaultValue={depositSettings.depositMode}>{DEPOSIT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
            <label><span>Дефолтный депозит, ₽</span><input name="defaultDepositAmount" type="number" min="0" defaultValue={depositSettings.defaultDepositAmount} /></label>
            <label><span>Депозит для компаний от</span><input name="requireDepositForGuestsFrom" type="number" min="1" defaultValue={depositSettings.requireDepositForGuestsFrom ?? ""} /></label>
            <label><span>Время на оплату, минут</span><input name="paymentTimeoutMinutes" type="number" min="1" defaultValue={depositSettings.paymentTimeoutMinutes} /></label>
          </div>
          <label className="check-row"><input name="requireDepositForLargeTables" type="checkbox" defaultChecked={depositSettings.requireDepositForLargeTables} />Требовать депозит для больших столов</label>
          <label className="check-row"><input name="requireDepositForPeakHours" type="checkbox" defaultChecked={depositSettings.requireDepositForPeakHours} />Требовать депозит в пятницу/субботу вечером</label>
          <label className="check-row"><input name="requireDepositForHighRiskGuests" type="checkbox" defaultChecked={depositSettings.requireDepositForHighRiskGuests} />Требовать депозит для гостей с высоким риском</label>
          <label><span>Как депозит учитывается</span><textarea name="depositAccountingText" rows={3} defaultValue={depositSettings.depositAccountingText || "Депозит будет учтен в счете гостя."} /></label>
          <label><span>Условия возврата</span><textarea name="depositRefundPolicyText" rows={3} defaultValue={depositSettings.depositRefundPolicyText || ""} /></label>
          <label><span>Юридическое уведомление</span><textarea name="legalNoticeText" rows={3} defaultValue={depositSettings.legalNoticeText || "Оплата депозита проходит напрямую ресторану по его платежной ссылке. Kaifbook не принимает деньги гостей."} /></label>
          <button className="button" type="submit">Сохранить депозитные правила</button>
        </form>
      </section>

      <section className="grid-layout two-columns">
        <form className="panel stack-form" action={createTableType.bind(null, restaurant.id)}>
          <h2>Типы столов</h2>
          <div className="stack-list">
            {restaurant.tableTypes.map((type) => (
              <div className="insight-row" key={type.id}>
                <strong>{type.title}: {type.minGuests}-{type.maxGuests} гостей</strong>
                <span>{type.isDepositRequired ? `Депозит ${type.defaultDepositAmount} ₽` : "Без обязательного депозита"} · код {type.code}</span>
              </div>
            ))}
          </div>
          <div className="form-grid two">
            <label><span>Название</span><input name="title" placeholder="Большой стол" required /></label>
            <label><span>Код</span><input name="code" placeholder="large" required /></label>
            <label><span>Мин. гостей</span><input name="minGuests" type="number" min="1" defaultValue="1" /></label>
            <label><span>Макс. гостей</span><input name="maxGuests" type="number" min="1" defaultValue="8" /></label>
            <label><span>Стоимость брони, ₽</span><input name="defaultBookingPrice" type="number" min="0" defaultValue="0" /></label>
            <label><span>Депозит, ₽</span><input name="defaultDepositAmount" type="number" min="0" defaultValue="2000" /></label>
          </div>
          <label className="check-row"><input name="isDepositRequired" type="checkbox" />Депозит обязателен для этого типа</label>
          <label><span>Описание</span><textarea name="description" rows={3} /></label>
          <button className="button" type="submit">Добавить тип стола</button>
        </form>

        <form className="panel stack-form" action={createPricingRule.bind(null, restaurant.id)}>
          <h2>Правила стоимости</h2>
          <div className="stack-list">
            {restaurant.bookingPricingRules.slice(0, 6).map((rule) => (
              <div className="insight-row" key={rule.id}>
                <strong>{rule.title} · приоритет {rule.priority}</strong>
                <span>{rule.table?.number ? `стол ${rule.table.number}` : rule.tableType?.title || "любой стол"} · депозит {rule.isDepositRequired ? `${rule.depositAmount} ₽` : "не нужен"}</span>
              </div>
            ))}
            {!restaurant.bookingPricingRules.length ? <p className="muted">Пока нет кастомных правил. Будут применяться настройки стола или типа стола.</p> : null}
          </div>
          <label><span>Название</span><input name="title" placeholder="Большой стол вечером" required /></label>
          <div className="form-grid two">
            <label><span>Тип стола</span><select name="tableTypeId"><option value="">Любой</option>{restaurant.tableTypes.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}</select></label>
            <label><span>Конкретный стол</span><select name="tableId"><option value="">Любой</option>{allTables.map((table) => <option key={table.id} value={table.id}>{table.hallTitle}: стол {table.number}</option>)}</select></label>
            <label><span>Мин. гостей</span><input name="minGuests" type="number" min="1" /></label>
            <label><span>Макс. гостей</span><input name="maxGuests" type="number" min="1" /></label>
            <label><span>День недели</span><select name="dayOfWeek"><option value="">Любой</option>{DAY_LABELS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
            <label><span>Приоритет</span><input name="priority" type="number" defaultValue="10" /></label>
            <label><span>Время начала</span><input name="startTime" type="time" /></label>
            <label><span>Время окончания</span><input name="endTime" type="time" /></label>
            <label><span>Стоимость брони, ₽</span><input name="bookingPrice" type="number" min="0" defaultValue="0" /></label>
            <label><span>Депозит, ₽</span><input name="depositAmount" type="number" min="0" defaultValue="2000" /></label>
          </div>
          <label className="check-row"><input name="isDepositRequired" type="checkbox" defaultChecked />Депозит обязателен</label>
          <button className="button" type="submit">Добавить правило</button>
        </form>
      </section>

      <section className="grid-layout two-columns">
        <form className="panel stack-form" action={saveNoShowSettings.bind(null, restaurant.id)}>
          <h2>Подтверждения и напоминания</h2>
          <label className="check-row"><input name="reminderEnabled" type="checkbox" defaultChecked={noShowSettings.reminderEnabled} />Включить напоминания</label>
          <label className="check-row"><input name="secondReminderEnabled" type="checkbox" defaultChecked={noShowSettings.secondReminderEnabled} />Второе напоминание перед визитом</label>
          <label className="check-row"><input name="requireGuestConfirmation" type="checkbox" defaultChecked={noShowSettings.requireGuestConfirmation} />Просить гостя подтвердить визит по ссылке</label>
          <label className="check-row"><input name="autoMarkAtRiskEnabled" type="checkbox" defaultChecked={noShowSettings.autoMarkAtRiskEnabled} />Автоматически подсвечивать риск неявки</label>
          <div className="form-grid two">
            <label><span>Первое напоминание, часов до визита</span><input name="reminderHoursBefore" type="number" min="1" defaultValue={noShowSettings.reminderHoursBefore} /></label>
            <label><span>Второе, минут до визита</span><input name="secondReminderMinutesBefore" type="number" min="15" defaultValue={noShowSettings.secondReminderMinutesBefore} /></label>
            <label><span>Дедлайн подтверждения, минут</span><input name="confirmationDeadlineMinutesBefore" type="number" min="15" defaultValue={noShowSettings.confirmationDeadlineMinutesBefore} /></label>
          </div>
          <button className="button" type="submit">Сохранить no-show правила</button>
        </form>

        <aside className="panel">
          <h2>Где разместить ссылку на бронь</h2>
          <div className="booking-link-box">
            <strong>{bookingUrl}</strong>
            <span>Разместите ссылку в VK, Telegram, 2ГИС, Яндекс Картах, на сайте ресторана или в QR-коде на столе.</span>
            <Link className="button client-cta" href={bookingUrl}>Открыть страницу брони</Link>
          </div>
          <div className="stack-list">
            <div className="insight-row"><strong>Оплата напрямую ресторану</strong><span>Гость переходит по вашей HTTPS-ссылке. Ресторан сам пробивает чек, проверяет оплату и оформляет возврат при необходимости.</span></div>
            <div className="insight-row"><strong>Гость видит условия заранее</strong><span>Сумма и объяснение показываются до отправки заявки, поэтому менеджеру не нужно объяснять это вручную.</span></div>
            <div className="insight-row"><strong>CRM запоминает no-show</strong><span>Гости с историей неявок получают высокий риск и могут попадать под депозитное правило.</span></div>
          </div>
        </aside>
      </section>
    </div>
  );
}
