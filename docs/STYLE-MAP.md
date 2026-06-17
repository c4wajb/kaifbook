# STYLE-MAP — Reserve Kursk / Stolix

Карта стилей для дизайн-полировки. **Не удалять дубли массово** — `globals.css`
построен слоями, и для каждого правила «побеждает» **последнее** вхождение по
каскаду. Правки вносим в правильный (последний) слой, иначе их перебьёт.

## 1. Модель каскада

`src/app/globals.css` (~15 750 строк) — единственный импортируемый CSS
(подключён в `layout.tsx`). Внутри — ~24 последовательных «слоя-полировки»,
каждый перекрывает предыдущие. Слои (по комментариям-маркерам):

| Строка | Слой |
|-------:|------|
| 24 | Unified product polish |
| 55 | Final visual alignment layer |
| 1549 | Client-facing polish |
| 2292 | Final public UX repair (warm palette, booking page) |
| 2604 | **Final 2026 warm luxury layer. Kept last intentionally** |
| 3043 | Restaurant catalog polish (cards, filters) |
| 3597 | Homepage final tuning (hero slider, filters) |
| 3880 | Restaurant filters final redesign |
| 5939 | Final polish: banner carousel + confirmation card |
| 6899 | Hall configurator / booking time picker / catalog polish |
| 9202 | Hall editor layering (kept last to override editor rules) |
| 9964 | Public booking scheme layering |
| 10924 | Final catalog alignment pass (mobile toolbar, card CTAs) |
| 11840 | **Catalog toolbar final alignment** ← последнее слово по фильтрам |
| 14834 | Card 24px + book button 16px |
| ~15700 | (хвост) booking-table статус-цвета + legend + перенос заголовков (этот сезон) |

## 2. Компоненты → где лежат стили

### Хедер — `AppHeader.tsx`
- `.app-header` база: **3**; override **1298**; mobile **1526**, и `@media(max-width:720px)` **7953** (`display:flex` важный).
- Классы: `.app-header.public-header`, `.app-header.office-header`, `.brand`, `.main-nav`, `.header-actions`, `.user-chip`.

### Фильтр-бар каталога — `RestaurantFilters.tsx`  ⚠️ ДВЕ системы
- **Актуальная** (рендерится компонентом): `.catalog-filter-strip`, `.catalog-search-field`,
  `.catalog-mobile-filter-button`, `.catalog-layout-bar`, `.catalog-filter-controls`,
  `.filter-dropdown.catalog-filter-chip`, `.catalog-filter-trigger`, `.catalog-filter-menu`,
  `.catalog-filter-sheet-head/-actions`.
  - База: **4789–4968**. Desktop grid (виновник обрезки): **11327–11360** + финал **11841** (≥1180px) и **11856** (681–1179px).
  - Обрезка подписей: `grid-template-columns` с фикс. колонками **+** span `max-width:min(230px,24vw);overflow:hidden;text-overflow:ellipsis` на **11378**.
- **Легаси** (НЕ используется компонентом, оставить как есть): `.restaurant-filter-bar`, `.filter-search`, `.filter-pill`, `.filter-submit`, `.filter-reset` — десятки дублей (789, 1628, 1850, 2103, 2331, 2442…).

### Карточки — `.restaurant-card`, `.restaurant-rail`, `.restaurants-grid`
- Сетка рядов: **861**, **1942/1946**, **2805**, медиа **1083/1118/2007/2016/2940/2967**.
- Карточка: **1380**, **1950**, catalog-polish **3043+**, title-block clamp **11395–11419**.
- Режимы: `.catalog-layout-grid` (компактный) vs `.catalog-layout-large`.

### Герой-слайдер — `HomeBannerSlider.tsx`
- `.home-banner-slider`: **3613–3872**, финал **5940–6010+** (`.banner-copy`, `.banner-copy h2/p`, `.showcase-meta`).
- Базовый `.restaurant-showcase`: 730, 1827, 2076, 2712, 2328.
- Пустой слайд без фото = плоский тёмный прямоугольник (Task 4).

### Схема брони — `PublicHallBookingWidget.tsx`
- `.public-booking-board`: **42**, **1027**, **1422**, **2918**, медиа **53/3024**.
- `.booking-table` / `.booking-table-core`: статусы **1038–1083** + `.requires-deposit` **2546** + хвост (~15700, этот сезон — сейчас зелёный=свободно/красный=занято).
- Легенда: `.hall-legend` + `.legend-free/-busy/-selected/-warning` — **46** + хвост.
- Зум-панель: `.public-booking-board-scroll`, `.fit-to-view` (перекрывает стол №5 — Task 5).

### Формы брони — `ReservationForm.tsx`, `.reservation-form`, `.form-grid.two`
- **1006**, **1324**, **2901**, `.public-reserve-page .reservation-form` **2523/3005**.

## 3. Типографика (Task 3)
- `font-family:` встречается **31 раз**. Стеки вперемешку: Arial (body), Inter/Manrope (`--font-sans`-подобные), Georgia/Times (заголовки), ui-monospace (код).
- `body` font-family: ~638. Переменные ожидаются: `--font-serif` (заголовки, сейчас Georgia/Playfair), `--font-sans` (текст). Цель: свести всё к этим двум (моно для кода оставить).

## 4. Жёсткие правила правок
- Только токены `:root`; новые цвета — `oklch()` в тёплой гамме (хрома ≤ 0.04).
- Проверка на 1440 / 980 / 390; брейкпоинты 980 и 680 (плюс фактические 1180/720 в финальных слоях).
- Хит-таргет ≥ 44px (моб.), текст на баннерах ≥ 16px.
- Правки — в последний слой по каскаду; при неоднозначности — спросить, не плодить дубли.

## 5. Конфликт направления (отметка)
Task 5 (тёплая палитра схемы: свободно=белый, выбран=терракот, занят=приглушённый,
зелёный только для «подтверждено») **меняет направление** прошлой правки
(зелёный=свободно / красный=занято для макс. контраста). Реализуем по новому
брифу; следим, чтобы свободно/занято всё равно уверенно различались
(белый+тень против плоского приглушённого).
