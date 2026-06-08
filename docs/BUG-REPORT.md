<!-- QA bug report — 2026-06-08 -->

# Финальный отчёт о баг-репорте — Kaifbook

Всего проверенных багов: **18**. Сгруппированы по тяжести: **Сломано** (1), **Серьёзные** (11), **Мелкие** (6).

---

## 🔴 Сломано (критично — функционал не работает)

### 1. Сотрудник с существующим аккаунтом не может попасть в раздел персонала (роль User не обновляется)

- **Область:** owner-staff-permissions
- **Файл:** `src/app/api/owner/restaurants/[restaurantId]/staff/route.ts` (строки 43–62); связанные: `src/lib/page-auth.ts:5`, `src/lib/constants.ts:43`
- **Как воспроизвести:**
  1. Пользователь регистрируется как гость/клиент — по умолчанию получает `role='customer'`.
  2. Владелец ресторана добавляет этого пользователя в персонал с ролью `waiter`.
  3. POST-эндпоинт создаёт запись `restaurantStaffAccess` с `role='waiter'`, но **не трогает** `user.role` (остаётся `customer`).
  4. Пользователь логинится и переходит на страницу персонала ресторана.
  5. `requireOwnerPageUser` проверяет `user.role` против `OWNER_ROLES`. `customer` там нет.
  6. Пользователя редиректит на `/owner/login` вместо доступа к функциям персонала.
- **Ожидается:** при добавлении существующего пользователя в персонал либо (A) его `user.role` обновляется до роли персонала (`waiter`, `restaurant_manager`), либо (B) проверки прав смотрят на записи `RestaurantStaffAccess`, а не только на `User.role`.
- **По факту:** существующие аккаунты, добавленные в персонал, сохраняют исходную роль `customer` и не получают доступа. Поведение асимметрично: **новые** пользователи, создаваемые как персонал, получают роль корректно (строка 56), а **существующие** — нет.
- **Исправление:** в POST-роуте (строки 43–62) после вызова `restaurantStaffAccess.create` добавить обновление роли пользователя:
  ```ts
  if (user && user.role !== staffRole) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: staffRole },
    });
  }
  ```
  Это синхронизирует `user.role` с фактической ролью персонала.

---

## 🟠 Серьёзные

### 2. Нет серверной проверки `minAdvanceBookingMinutes`

- **Область:** booking-availability
- **Файл:** `src/lib/reservations.ts` (функция `validateReservationBusinessRules`, ~строки 106–145)
- **Как воспроизвести:**
  1. У ресторана `minAdvanceBookingMinutes = 60` (бронь минимум за час).
  2. Текущее время: 14:00.
  3. Пользователь пытается забронировать стол на 14:30 (за 30 минут).
  4. Клиентский UI это блокирует, фильтруя слоты.
  5. Пользователь обходит UI прямым вызовом `POST /api/restaurants/{id}/reservations` с `startTime=14:30` и `reservationDate=today`.
  6. Бронь создаётся (баг — должна быть отклонена).
- **Ожидается:** создание брони падает с ошибкой вида «Бронировать можно не позднее чем за 60 минут», если до начала брони меньше `minAdvanceBookingMinutes`.
- **По факту:** бронь создаётся успешно даже при нарушении `minAdvanceBookingMinutes` — серверная валидация этого параметра вообще отсутствует. Функция проверяет `maxAdvanceBookingDays`, лимиты гостей, рабочие часы, вместимость столов, но не минимальный запас по времени. Параметр существует в модели `ReservationSettings` (`prisma/schema.prisma:622`) и читается через `restaurant.settings`, но не валидируется.
- **Исправление:** в `validateReservationBusinessRules` (~строка 118) добавить проверку: вычислить разницу в минутах между текущим временем и `reservationDate + startTime`; если меньше `minAdvanceBookingMinutes` — бросить `ApiError`. Учесть флаг `allowInactiveRestaurant` для сценариев обновления.

---

### 3. `dayOfWeek()` использует `getDay()` вместо `getUTCDay()` — несовпадение правил ценообразования по дням недели

- **Область:** datetime-slots
- **Файл:** `src/lib/reservation-pricing.ts:31-33`
- **Как воспроизвести:** бронь на пятницу UTC 20:00. Сервер в Europe/Moscow (UTC+3) — это уже суббота по локальному времени. `dayOfWeek()` вернёт 6 (суббота), и правила цены для пятницы (`dayOfWeek=5`) не применятся, а правила субботы применятся ошибочно.
- **Ожидается:** `dayOfWeek()` возвращает день недели по UTC, согласованно со всем остальным кодом (`getUTCDay()`). Правила цены применяются по UTC-дню, а не по локальному дню сервера.
- **По факту:** `dayOfWeek()` возвращает `getDay()` (зависит от таймзоны), из-за чего `ruleMatches()` (строка 41) сравнивает с неверным днём недели на не-UTC серверах. Несогласованность подтверждается: `dateFromInput()` (`time.ts`) создаёт UTC-даты, валидация брони (`reservations.ts:120`) использует `dayOfWeekFromDate()` → `getUTCDay()`, а ценообразование — `getDay()`.
- **Исправление:** заменить строку 32 `return date.getDay();` на `return date.getUTCDay();`, согласовав с `dayOfWeekFromDate()` из `time.ts`.

---

### 4. Определение пикового часа использует локальный `getDay()` — неверное применение премиум-цены в Пт/Сб

- **Область:** datetime-slots
- **Файл:** `src/lib/reservation-pricing.ts:105`
- **Как воспроизвести:** ресторан в Москве, сервер в UTC. Бронь на пятницу UTC 16:00 = суббота 19:00 по Москве; это **должен** быть пик, но `getDay()` вернёт 5 (пятница UTC), а не 6 (суббота), и логика депозита не сработает. Обратно: четверг UTC 22:00 = пятница 01:00 по Москве — пик может сработать ошибочно.
- **Ожидается:** требование депозита в пиковый час считается стабильно по UTC-дню недели (совпадая с `BookingPricingRule.dayOfWeek`), либо конвертируется в локальную таймзону ресторана.
- **По факту:** `dayOfWeek(date)` (зависит от таймзоны) сравнивается с захардкоженными индексами `[5, 6]` (Пт/Сб по UTC). На не-UTC сервере день недели сдвигается, и пик срабатывает не в те дни. Противоречит проверке рабочих часов (`reservations.ts:120`, `availability/route.ts:79`), которая корректно использует UTC.
- **Исправление:** либо (1) использовать `getUTCDay()` напрямую в строке 105, либо (2) — **рекомендуется** — починить саму функцию `dayOfWeek()` (см. баг №3), что закрывает оба бага сразу. Идеально — заменить локальную `dayOfWeek()` на `dayOfWeekFromDate()` из `time.ts`.

---

### 5. Сумма депозита не показывается гостю, когда внешние платежи выключены

- **Область:** money-pricing
- **Файл:** `src/lib/external-payments.ts` (строки 47–52); связанное: `src/lib/reservations.ts` (строки 188–206)
- **Как воспроизвести:**
  1. Ресторан включает внутренние депозиты (`depositEnabled=true`), но не задаёт `externalPaymentUrl` (или он выключен).
  2. Гость бронирует на 6 человек — срабатывает требование депозита (`requireDepositForGuestsFrom=4`, `defaultDepositAmount=1000`).
  3. `calculateReservationPrice` корректно возвращает `depositAmount=1000`.
  4. `applyExternalDepositToPricing` сбрасывает `depositAmount=0`, так как внешние платежи выключены.
  5. У брони `paymentRequired=false` и `depositAmount=0`.
  6. Гость видит «Оплата при бронировании не требуется».
- **Ожидается:** гость видит, что нужен депозит 1000 ₽, с пояснением о порядке его внесения согласно политике ресторана.
- **По факту:** гость не видит требования депозита; рассчитанная сумма теряется в `applyExternalDepositToPricing`. Функция смешивает «возможность внешней оплаты» с «требованием депозита» — депозит можно собрать и внутренне (наличные, у стола, ручное подтверждение).
- **Исправление:** один из вариантов: (1) хранить и показывать рассчитанный `depositAmount` отдельно от `paymentRequired/paymentAmount`; (2) в `applyExternalDepositToPricing` сохранять рассчитанный `depositAmount` даже при выключенных внешних платежах; (3) включать сумму депозита в `pricingExplanation` независимо от режима оплаты.

---

### 6. `getOrCreateCustomerUser` привязывает гостевые брони к не-клиентским аккаунтам

- **Область:** phone-crm-guests
- **Файл:** `src/lib/reservations.ts:315-344`
- **Как воспроизвести:** владелец ресторана с телефоном `+79991234567` зарегистрирован с `role='restaurant_owner'`. Гость пытается забронировать с тем же телефоном. `getOrCreateCustomerUser` находит владельца (без фильтра по роли), видит, что роль не `customer`, пропускает обновление `fullName`, но **всё равно возвращает ID владельца**. Бронь привязывается к аккаунту владельца вместо создания/поиска клиента.
- **Ожидается:** функция возвращает только пользователя с ролью `customer`. Если такого нет — создаёт нового. Не-клиентские аккаунты не возвращаются.
- **По факту:** функция возвращает любого пользователя с совпадающим телефоном независимо от роли (строка 321). Проверка роли (строка 318) влияет только на обновление `fullName`, но не препятствует возврату не-клиента. Брони привязываются к admin/staff/owner аккаунтам.
- **Исправление:** добавить фильтр по роли в строке 316: `where: { phone: input.phone, role: "customer" }` (как в `getOrCreateGuestUser` в `guest-phone-auth.ts:98-99`). Также добавить фильтр `isActive` для согласованности.

---

### 7. Гонка в `getOrCreateGuest` приводит к падению при дубликате гостя

- **Область:** phone-crm-guests
- **Файл:** `src/lib/reservations.ts:266-276`
- **Как воспроизвести:** два одновременных запроса `POST /api/public/restaurants/[slug]/reservations` с одинаковыми телефоном и рестораном. Оба вызывают `createReservation` → `getOrCreateGuest`. T1: оба `findUnique` возвращают `null`. T2: запрос A делает `create` — успех. T3: запрос B делает `create` — нарушение уникального ограничения `(restaurantId, phone)`, необработанная ошибка БД, падение второй брони.
- **Ожидается:** оба запроса успешны и привязаны к одной записи гостя; ошибок БД нет.
- **По факту:** второй запрос падает с ошибкой уникального ограничения Prisma (P2002) из-за паттерна check-then-act без атомарности; роут возвращает общий 500.
- **Исправление:** заменить `findUnique` + `create` на атомарный `upsert`:
  ```ts
  prisma.guest.upsert({
    where: { restaurantId_phone: { restaurantId: input.restaurantId, phone: input.phone } },
    update: { name: input.name, email: input.email || undefined },
    create: { restaurantId: input.restaurantId, name: input.name, phone: input.phone, email: input.email || null, tags: "[]" },
  })
  ```

---

### 8. Метрика `newGuests` завышена — включает повторных клиентов

- **Область:** analytics-dashboard
- **Файл:** `src/lib/owner-analytics.ts:52`
- **Как воспроизвести:** гость впервые пришёл 25 дней назад и сделал вторую бронь сегодня. Он попадает и в `newGuests` (создан в окне последних 30 дней), и в `repeatGuests` (2+ брони). В UI метрики подаются как взаимоисключающие, но пересекаются.
- **Ожидается:** `newGuests` считает только гостей ровно с 1 броней (действительно новых):
  ```ts
  prisma.guest.count({ where: { restaurantId, createdAt: { gte: last30 }, reservationsCount: { eq: 1 } } })
  ```
- **По факту:** считаются все гости, созданные за 30 дней, включая тех, кто уже имеет несколько броней. `refreshGuestStats` (`reservations.ts:278-312`) подтверждает, что `reservationsCount` хранит общее число броней.
- **Исправление:** в строке 52 добавить фильтр `reservationsCount: { eq: 1 }`, чтобы метрики стали взаимоисключающими.

---

### 9. Метрика `cancelledRate` занижена — не учитывает отмены гостем и рестораном

- **Область:** analytics-dashboard
- **Файл:** `src/lib/owner-analytics.ts:5,65`
- **Как воспроизвести:** ресторан: 10 броней — 1 `CANCELLED`, 2 `CANCELLED_BY_GUEST`, 1 `CANCELLED_BY_RESTAURANT`, 0 `REJECTED`, 0 `NO_SHOW`. Метрика считает только 1 `CANCELLED` → 10% вместо реальных 40% (4/10).
- **Ожидается:** `cancelledRate` включает все статусы отмен: `CANCELLED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_RESTAURANT`, `REJECTED`, `NO_SHOW` — как в эталонном массиве `CANCELLED_STATUSES` из `no-show-analytics.ts` (строки 8–12).
- **По факту:** `LOST_STATUSES` (строка 5) включает только `[CANCELLED, REJECTED, NO_SHOW]`, пропуская `CANCELLED_BY_GUEST` и `CANCELLED_BY_RESTAURANT`. Строка 65 использует этот неполный массив, существенно занижая показатель.
- **Исправление:** дополнить `LOST_STATUSES`:
  ```ts
  const LOST_STATUSES = [
    RESERVATION_STATUSES.CANCELLED,
    RESERVATION_STATUSES.CANCELLED_BY_GUEST,
    RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT,
    RESERVATION_STATUSES.REJECTED,
    RESERVATION_STATUSES.NO_SHOW,
  ];
  ```

---

### 10. `QrModal`: fetch без AbortController вызывает setState на размонтированном компоненте

- **Область:** react-client-state
- **Файл:** `src/components/MenuOrderPage.tsx:45-51`
- **Как воспроизвести:** пользователь открывает QR-модалку («QR-код»), стартует fetch. До ответа API закрывает модалку (компонент размонтируется). По завершении fetch хендлеры `.then()/.catch()/.finally()` вызывают setState на размонтированном компоненте.
- **Ожидается:** setState не вызывается на размонтированном компоненте; fetch отменяется через `AbortController` при размонтировании (или проверяется флаг `mounted`).
- **По факту:** нет ни отмены запроса, ни проверки монтирования. В React 19.2.6 классическое предупреждение уже не выводится, поэтому баг «тихий», но это утечка/неэффективность. В проекте есть abort-совместимые утилиты (`client-fetch.ts`), но они здесь не используются.
- **Исправление:** обернуть fetch в `AbortController` и проверять флаг перед setState:
  ```ts
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    async function loadQr() {
      try {
        const r = await fetch(`/api/restaurants/${slug}/menu-qr`, { signal: controller.signal });
        const d = await r.json();
        if (mounted) setQrSvg(d.svg);
      } catch (error) {
        if (mounted && error.name !== "AbortError") setQrSvg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadQr();
    return () => { mounted = false; controller.abort(); };
  }, [slug]);
  ```

---

### 11. `acceptReservationByToken`: нет проверки состояния — можно подтвердить отменённую/завершённую бронь

- **Область:** public-flow-routing
- **Файл:** `src/lib/public-reservation-confirmation.ts` (строки 30–69)
- **Как воспроизвести:**
  1. Создать бронь с токеном подтверждения.
  2. Ресторан помечает её `COMPLETED`.
  3. Гость по ссылке токена вызывает `POST /api/public/reservations/confirm/[token]/accept`.
  4. API обновляет статус брони, нарушая стейт-машину.
- **Ожидается:** функция проверяет, что бронь не в терминальном статусе (`CANCELLED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_RESTAURANT`, `COMPLETED`, `REJECTED`, `NO_SHOW`) перед переходом.
- **По факту:** переход разрешён из любого статуса, включая терминальные (строки 40–44). Токен не инвалидируется после достижения терминального состояния — бронь можно «переподтвердить».
- **Исправление:** добавить в начало функции:
  ```ts
  const closedStatuses = [
    RESERVATION_STATUSES.CANCELLED, RESERVATION_STATUSES.CANCELLED_BY_GUEST,
    RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT, RESERVATION_STATUSES.NO_SHOW,
    RESERVATION_STATUSES.REJECTED, RESERVATION_STATUSES.COMPLETED,
  ];
  if (closedStatuses.includes(reservation.status)) throw new ApiError(409, "This reservation cannot be confirmed");
  ```

---

### 12. `cancelReservationByToken`: нет проверки состояния — можно отменить уже отменённую/завершённую бронь

- **Область:** public-flow-routing
- **Файл:** `src/lib/public-reservation-confirmation.ts` (строки 71–95)
- **Как воспроизвести:**
  1. Создать бронь с токеном.
  2. Гость отменяет её (`CANCELLED_BY_GUEST`).
  3. Гость тем же токеном снова вызывает `POST /api/public/reservations/confirm/[token]/cancel`.
  4. API обновляет бронь повторно, генерируя дубль уведомления о отмене.
- **Ожидается:** функция проверяет, что бронь не в терминальном статусе, и отклоняет запрос.
- **По факту:** отмена разрешена при любом текущем статусе — допустимы повторные отмены и некорректные переходы. (Примечание: функция создаёт уведомления, а не audit-логи — формулировка про «audit log» в исходнике неточна, но суть бага верна.)
- **Исправление:** добавить в начало функции:
  ```ts
  const closedStatuses = [
    RESERVATION_STATUSES.CANCELLED, RESERVATION_STATUSES.CANCELLED_BY_GUEST,
    RESERVATION_STATUSES.CANCELLED_BY_RESTAURANT, RESERVATION_STATUSES.NO_SHOW,
    RESERVATION_STATUSES.REJECTED, RESERVATION_STATUSES.COMPLETED,
  ];
  if (closedStatuses.includes(reservation.status)) throw new ApiError(409, "This reservation cannot be cancelled");
  ```

---

## 🟡 Мелкие

Общая первопричина для багов 13–18: в кодовой базе **нет утилиты склонения** существительных по числам в русском языке. Везде, где выводится количество гостей, используется захардкоженное «гост.» (или неполная бинарная логика). Правильное правило: `count % 10 == 1 && count % 100 != 11` → «гость»; `count % 10 ∈ [2,3,4] && count % 100 ∉ [12,13,14]` → «гостя»; иначе → «гостей».

**Рекомендуемое системное исправление:** ввести единую функцию, например `pluralizeRu(count, ["гость", "гостя", "гостей"])`, и применить её во всех точках вывода ниже.

### 13. Захардкоженное «гост.» в списке броней админа

- **Область:** i18n-formatting · **Файл:** `src/app/admin/reservations/page.tsx:5`
- **Как воспроизвести:** админ смотрит список броней с 2, 3, 4 или 5+ гостями.
- **Ожидается:** «2 гостя», «3 гостя», «4 гостя», «5 гостей».
- **По факту:** «2 гост.», «3 гост.», «4 гост.», «5 гост.» для всех чисел.
- **Исправление:** применить функцию склонения по `count`: 1 → «гость», 2–4 → «гостя», 5+ → «гостей».

### 14. Захардкоженное «гост.» на странице деталей гостя

- **Область:** i18n-formatting · **Файл:** `src/app/owner/restaurants/[restaurantId]/guests/[guestId]/page.tsx:69`
- **Как воспроизвести:** менеджер открывает карточку гостя с бронью на 2, 3 или 4 гостей.
- **Ожидается:** «3 гостя».
- **По факту:** «3 гост.».
- **Исправление:** заменить «гост.» на правильную форму склонения по числу.

### 15. Захардкоженное «гост.» в листе ожидания на странице неявок

- **Область:** i18n-formatting · **Файл:** `src/app/owner/restaurants/[restaurantId]/no-show/page.tsx:86`
- **Как воспроизвести:** менеджер смотрит лист ожидания с записями на 2, 3 или 4 гостей.
- **Ожидается:** «2 гостя», «3 гостя».
- **По факту:** «2 гост.», «3 гост.».
- **Исправление:** применить функцию-селектор склонения для русского.

### 16. Захардкоженное «гост.» в карточках брони во вью официанта

- **Область:** i18n-formatting · **Файл:** `src/components/WaiterHallView.tsx:165`
- **Как воспроизвести:** официант смотрит выбранный стол с бронями на 2, 3 или 5+ гостей.
- **Ожидается:** «2 гостя · 19:00», «3 гостя · 19:00», «5 гостей · 19:00».
- **По факту:** «2 гост. · 19:00», «3 гост. · 19:00», «5 гост. · 19:00».
- **Исправление:** реализовать селектор склонения по `guestsCount`.

### 17. Неполное склонение на странице броней владельца

- **Область:** i18n-formatting · **Файл:** `src/app/owner/restaurants/[restaurantId]/reservations/page.tsx:281`
- **Как воспроизвести:** менеджер смотрит карточку брони на 2, 3 или 4 гостей.
- **Ожидается:** «2 гостя», «3 гостя», «4 гостя».
- **По факту:** «2 гостей», «3 гостей», «4 гостей» — текущий код `guestsCount === 1 ? "гость" : "гостей"` пропускает форму родительного падежа ед. ч. «гостя» для 2–4.
- **Исправление:** расширить тернар до трёх случаев: `1` → «гость», `count % 10 ∈ [2,4]` (с учётом исключений 12–14) → «гостя», иначе → «гостей».

### 18. Захардкоженное «гост.,» в тексте уведомления о брони

- **Область:** i18n-formatting · **Файл:** `src/lib/reservations.ts:237`
- **Как воспроизвести:** создаётся бронь на 2, 3 или 4 гостей — триггерится уведомление.
- **Ожидается:** «John, 2 гостя, 19:00» / «Jane, 3 гостя, 19:00».
- **По факту:** «John, 2 гост., 19:00» / «Jane, 3 гост., 19:00».
- **Исправление:** применить функцию склонения к `guestsCount` в тексте уведомления.

---

## Сводка

| # | Тяжесть | Область | Файл |
|---|---------|---------|------|
| 1 | Сломано | owner-staff-permissions | `staff/route.ts` |
| 2 | Серьёзный | booking-availability | `reservations.ts` |
| 3 | Серьёзный | datetime-slots | `reservation-pricing.ts:31-33` |
| 4 | Серьёзный | datetime-slots | `reservation-pricing.ts:105` |
| 5 | Серьёзный | money-pricing | `external-payments.ts:47-52` |
| 6 | Серьёзный | phone-crm-guests | `reservations.ts:315-344` |
| 7 | Серьёзный | phone-crm-guests | `reservations.ts:266-276` |
| 8 | Серьёзный | analytics-dashboard | `owner-analytics.ts:52` |
| 9 | Серьёзный | analytics-dashboard | `owner-analytics.ts:5,65` |
| 10 | Серьёзный | react-client-state | `MenuOrderPage.tsx:45-51` |
| 11 | Серьёзный | public-flow-routing | `public-reservation-confirmation.ts:30-69` |
| 12 | Серьёзный | public-flow-routing | `public-reservation-confirmation.ts:71-95` |
| 13 | Мелкий | i18n-formatting | `admin/reservations/page.tsx:5` |
| 14 | Мелкий | i18n-formatting | `guests/[guestId]/page.tsx:69` |
| 15 | Мелкий | i18n-formatting | `no-show/page.tsx:86` |
| 16 | Мелкий | i18n-formatting | `WaiterHallView.tsx:165` |
| 17 | Мелкий | i18n-formatting | `reservations/page.tsx:281` |
| 18 | Мелкий | i18n-formatting | `reservations.ts:237` |

**Ключевые рекомендации:**
- Багажи 3 и 4 закрываются одним исправлением — починить `dayOfWeek()` в `reservation-pricing.ts`, заменив на `getUTCDay()` (или используя `dayOfWeekFromDate()` из `time.ts`).
- Багажи 11 и 12 — добавить единую guard-проверку терминальных статусов; стоит вынести `closedStatuses` в общую константу.
- Багажи 13–18 — ввести одну утилиту склонения `pluralizeRu()` и применить во всех 6 местах; это устранит весь класс ошибок i18n-форматирования.