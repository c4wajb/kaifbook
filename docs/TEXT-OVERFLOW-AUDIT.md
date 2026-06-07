# Аудит переполнения и переноса текста — Kaifbook

**Дата:** 2026-06-08
**Метод:** статический анализ TSX + `globals.css` по 11 поверхностям (11 finder-агентов → adversarial-проверка каждой находки против реального CSS → синтез) + живой осмотр публичных страниц на 375px.

## Контекст окружения
- Сборка `next build` проходит успешно (exit 0, все ~60 маршрутов).
- `prisma generate` на Windows иногда падает с `EPERM` (заблокированная DLL движка) — сборка проходит, если клиент уже сгенерирован.
- **Локальный `.env` рассинхронизирован с архитектурой:** `DATABASE_URL="file:./dev.db"` (SQLite), но схема Prisma и продакшн — `postgresql`. Правильный запуск локально — через `docker-compose.yml` (postgres + migrate + app) или подняв контейнер postgres и перенаправив dev-сервер. Из-за рассинхрона data-страницы локально падают с `PrismaClientInitializationError`.

## Что подтверждено живым осмотром (375px)
- Публичные страницы (главная, `/restaurants`, `/for-restaurants`, `/owner/login`) **реального горизонтального переполнения не дают** (`maxRight == 375`).
- Карточки ресторанов и заголовки баннеров используют `overflow-wrap: anywhere` и **устойчивы** к длинным названиям (стресс-тест 46–50-символьными неразрывными словами — не вылезают).
- Скриншоты в headless-превью рендерятся запасным шрифтом и **преувеличивают** переполнение — все находки сверены замером DOM, а не «на глаз».
- Риск концентрируется на data-страницах с пользовательским контентом (меню, брони, гости, e-mail сотрудников, адреса, метки столов), которые локально не рендерились — они покрыты статическим анализом ниже.

## Итог: 28 подтверждённых находок — 0 высоких / 10 средних / 18 низких

---

## Средний приоритет (видимое переполнение / обрезка с потерей контента)

### 1. Чипы залов переносятся на 2 строки и ломают высоту пилюли
- **Страница:** `/restaurants/[slug]/reserve`, `/r/[slug]/book`
- **Файл:** `src/components/PublicHallBookingWidget.tsx`; CSS `.hall-tabs button`
- **Проблема:** нет `white-space:nowrap`/`max-width`, высота через `min-height` → многословное название зала переносится внутри чипа.
```css
.hall-tabs button{ white-space:nowrap; max-width:min(60vw,220px); overflow:hidden; text-overflow:ellipsis; }
```

### 2. Подпись депозита вылезает за пределы стола на плане зала
- **Страница:** `/restaurants/[slug]/reserve`
- **Файл:** `src/components/PublicHallBookingWidget.tsx`; CSS `.booking-table-core small`
- **Проблема:** `.booking-table` — `overflow:visible`, у центрированного `<small>` («Депозит 12 000 ₽») нет контроля ширины → затекает на соседние столы (~76–82px стол).
```css
.booking-table-core small{ max-width:100%; padding-inline:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
```

### 3. Имя гостя в карточке брони выталкивает статус-бейдж
- **Страница:** `/owner/restaurants/[restaurantId]/reservations`
- **Файл:** `src/app/owner/restaurants/[restaurantId]/reservations/page.tsx`; CSS `.reservation-card-top`
- **Проблема:** левый flex-блок без `min-width:0`, `h3` без `overflow-wrap` → длинное имя выталкивает `<Badge>`/даёт горизонтальный скролл.
```css
.reservation-card-top > div{ min-width:0; }
.reservation-card-top h3{ overflow-wrap:anywhere; }
```

### 4. ServerDashboard: таблицы логов/процессов/БД без CSS
- **Страница:** `/admin/server`, `/stolix/server`
- **Файл:** `src/components/ServerDashboard.tsx`
- **Проблема:** классы `.server-access-*`/`.server-process-*`/`.server-db-*` отсутствуют в `globals.css` — стили лежат в **неимпортируемом** `src/styles/server-dashboard.css`. Грид схлопывается, длинные пути/команды переполняют карточку.
- **Фикс:** импортировать `src/styles/server-dashboard.css` ИЛИ перенести грид-правила в `globals.css`. Минимум:
```css
.server-access-path,.server-process-cmd,.server-top-path-row code,.server-db-row code{ overflow-wrap:anywhere; word-break:break-word; min-width:0; }
```

### 5. Admin-строки: длинный email/адрес переполняет flex-строку и выталкивает бейдж
- **Страницы:** `/admin/restaurants`, `/admin/users`, `/admin/leads`
- **Файлы:** `src/app/admin/restaurants/page.tsx`, `…/admin/users/page.tsx` (`.admin-row > div`); `src/app/admin/leads/page.tsx` (`.application-main`)
- **Проблема:** строки `display:flex` без `flex-wrap`/`min-width:0`; внутренний текстовый `<div>` (email владельца / комментарий лида) без `min-width:0`/`overflow-wrap`.
```css
.admin-row > div{ min-width:0; overflow-wrap:anywhere; }
.admin-row p{ overflow-wrap:anywhere; word-break:break-word; }
.application-main{ min-width:0; }
.application-main strong,.application-main span,.application-main small{ overflow-wrap:anywhere; word-break:break-word; }
```

### 6. Длинный email сотрудника переполняет строку/панель staff
- **Страница:** `/owner/restaurants/[restaurantId]/staff`
- **Файлы:** `src/components/StaffManager.tsx`, `…/staff/page.tsx`; CSS `.staff-info span`
- **Проблема:** `.staff-info` имеет `min-width:0`, но `.staff-info span` без `overflow-wrap`/`word-break`; у `.panel` нет `overflow:hidden` → email без пробелов может дать горизонтальный скролл на 375px.
```css
.staff-info span{ overflow-wrap:anywhere; word-break:break-word; }
/* опционально */ @media(max-width:560px){ .staff-row{ flex-wrap:wrap; } }
```

### 7. Адрес ресторана в шапке «пропуска» переполняет карточку
- **Страница:** `/reservation/confirm/[token]`
- **Файл:** `src/app/reservation/confirm/[token]/page.tsx`; CSS `.reservation-pass-header p`
- **Проблема:** `<p>` с адресом — `display:inline-flex` без `min-width:0`/`overflow-wrap`; обёртка без класса; у карточки нет `overflow:hidden`.
```css
.reservation-pass-header > div{ min-width:0; }
.reservation-pass-header p{ display:flex; min-width:0; overflow-wrap:anywhere; word-break:break-word; }
.reservation-pass-header p svg{ flex:0 0 auto; }
```

### 8. Заголовок ресторана (h1) на «пропуске» — нет overflow-wrap
- **Страница:** `/reservation/confirm/[token]`
- **Файл:** тот же; CSS `.reservation-pass-header h1`
- **Проблема:** `clamp(38px,6vw,68px)` + `text-wrap:balance` (не ломает токен без пробелов).
```css
.reservation-pass-header h1{ overflow-wrap:anywhere; word-break:break-word; }
```

### 9. VK-mini: заголовок блюда обрезается без многоточия
- **Страница:** `/vk-mini/restaurants/[slug]`
- **Файл:** `src/app/vk-mini/restaurants/[slug]/page.tsx`; CSS `.vk-mini-dish-card strong`
- **Проблема:** `min-height:2.4em` без `-webkit-line-clamp` → длинное название выходит за 2 строки и жёстко обрезается (потеря текста, сдвиг цены).
```css
.vk-mini-dish-card strong{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
```

### 10. VK-mini: контент hero обрезается сверху в фикс-высоте
- **Страница:** `/vk-mini/restaurants/[slug]`
- **Файл:** тот же; CSS `.vk-mini-place-hero` / `.vk-mini-place-content`
- **Проблема:** `min-height:520px;overflow:hidden` + контент `position:absolute` (привязан к низу) → при длинном title+description стек растёт вверх и обрезается СВЕРХУ.
- **Фикс:** дать hero расти — `height:auto;min-height:520px`, контент `position:relative;inset:auto` (Image/градиент оставить `absolute`). Альтернатива — `-webkit-line-clamp` на `.vk-mini-place-content p`.

---

## Низкий приоритет (косметика / редкие токены без пробелов)

| # | Где | Файл / селектор | Фикс |
|---|-----|-----------------|------|
| 11 | Бейдж кухни на карточке переносится | `RestaurantCard.tsx` · `.restaurant-card-cuisine-badge` | `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` (или `cuisines.slice(0,1)`) |
| 12 | Имя автора отзыва выталкивает рейтинг | `restaurants/[slug]/page.tsx` · `.review-card-head strong` | `min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap` + `.review-card-head span{flex:0 0 auto}` |
| 13 | Источник отзыва (URL) вылезает | то же · `.review-card small` | `overflow-wrap:anywhere` |
| 14 | Название блюда (публичное меню) обрезается | `MenuOrderPage.tsx` · `.menu-dish-body strong` | `overflow-wrap:anywhere` |
| 15 | Описание блюда обрезается mid-glyph | то же · `.menu-dish-body p` | `overflow-wrap:anywhere` |
| 16 | Название категории меню (desktop) | `MenuManager.tsx` · `.list-row > span` | `min-width:0;overflow-wrap:anywhere` |
| 17 | Значение в модалке успешной брони | `ReservationForm.tsx` · `.success-summary-list dd` | `overflow-wrap:anywhere;word-break:break-word` |
| 18 | Иконка в `.compact-note` сжимается | `AuthForm.tsx` · `.compact-note > svg` | `.compact-note{align-items:flex-start} .compact-note>svg{flex:0 0 auto;margin-top:2px}` |
| 19 | Подписи `.value-grid` в 3–4 строки (desktop) | `for-restaurants/page.tsx` · `.value-grid` | `.client-home-hero .value-grid{grid-template-columns:repeat(2,minmax(0,1fr))}` |
| 20 | Email в сайдбаре офиса (280px) | `app-shell.tsx` · `.sidebar-user` | `overflow:hidden` + `.sidebar-user strong,.sidebar-user>div{min-width:0;overflow-wrap:anywhere;word-break:break-word}` |
| 21 | Заголовок PageHeader рядом с toolbar | `page-header.tsx` · `.page-header h1` | `.page-header>div{min-width:0} .page-header h1{overflow-wrap:anywhere}` |
| 22 | Название/адрес в списке ресторанов (owner) | `owner/restaurants/page.tsx` · `.restaurant-admin-main strong/span` | `overflow-wrap:anywhere` |
| 23 | Строка брони (admin) выталкивает бейдж | `admin/reservations/page.tsx` · `.reservation-row > div` | `min-width:0;overflow-wrap:anywhere` |
| 24 | Текст стола (вместимость/цена) вылезает | `HallEditor.tsx`, `WaiterHallView.tsx` · `.hall-table` | `.hall-table{overflow:hidden} .hall-table span,.hall-table small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}` |
| 25 | Имя гостя в модалке тегов → гор. скролл | `GuestTagsEditor.tsx` · `.tag-editor-head h2` | `.tag-editor-head>div{min-width:0} .tag-editor-head h2{overflow-wrap:anywhere}` |
| 26 | Статус-Badge переносится на 2 строки | `Badge.tsx` (`/guest/reservations`, `/vk-mini/bookings`) | `.guest-reservation-head .badge{white-space:nowrap;flex-shrink:0;align-self:flex-start}` или `border-radius:10px;align-items:flex-start;line-height:1.25` |

*(№ 14–15, 12–13, и пары staff/admin объединены — это близкие проявления одного паттерна.)*

---

## Общий рецепт
~18 из 28 находок — один паттерн: **flex/grid-ребёнок без `min-width:0` + текст без `overflow-wrap:anywhere`**. Рекомендуется единым блоком в `globals.css`:

```css
/* Repeating row/title containers — let text shrink & break */
.admin-row > div,
.reservation-row > div,
.reservation-card-top > div,
.page-header > div,
.tag-editor-head > div,
.application-main{ min-width:0; }

.admin-row p, .reservation-row strong, .reservation-row p,
.reservation-card-top h3, .page-header h1, .tag-editor-head h2,
.application-main strong, .application-main span, .application-main small,
.restaurant-admin-main strong, .restaurant-admin-main span,
.staff-info span, .menu-dish-body strong, .menu-dish-body p,
.review-card small, .success-summary-list dd{ overflow-wrap:anywhere; word-break:break-word; }
```

Отдельно стоят 4 «pill/clip»-кейса (чипы залов, подпись депозита, VK-mini заголовок блюда, бейдж статуса — нужен `nowrap`/`line-clamp`/`ellipsis`) и 2 структурных (ServerDashboard без импорта CSS; VK-mini hero `overflow:hidden`), требующих правки разметки/импорта.
