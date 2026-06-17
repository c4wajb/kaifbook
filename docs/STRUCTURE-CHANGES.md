# STRUCTURE-CHANGES — структура проекта (refactor/structure-css)

Рефакторинг «по форме»: организация компонентов и уборка корня. **Рендер и
поведение не менялись** (перемещения файлов + пути импортов). Проверено:
`tsc --noEmit` (exit 0) + `npm run build` зелёные.

## Что сделано

### Компоненты → доменные папки (Etap 2)
Все 50 компонентов из плоского `src/components/*.tsx` разнесены по доменам, все
импорты `@/components/X` переписаны в `@/components/<домен>/X` (59 файлов).
Файлы и экспорты не переименовывались.

| Папка | Компоненты |
|---|---|
| `components/layout/` | AppHeader, AppFooter, app-shell, BrandLogo, ScrollToTopButton, CookieConsent, page-header |
| `components/ui/` | Badge, PrettySelect, DateInput, ChipSlider, flash-message, MinMaxFields, LogoutButton, ImageUploadField |
| `components/reservations/` | ReservationForm, ReservationActions, PublicHallBookingWidget, ReservationQrCard, ReservationSearchBox |
| `components/restaurant/` | RestaurantCard/CardGallery/Gallery/Form/Filters/LeadForm, MenuManager/Section/OrderPage, HallEditor/CreateForm, WaiterHallView, WorkingHoursForm, CatalogLayoutToggle, HomeBannerSlider, YandexMap, AgeGate, business-form, business-tabs |
| `components/guest/` | GuestLoginForm, GuestTagsEditor, AuthForm |
| `components/admin/` | AdminRestaurantActions, AdminRestaurantLeadActions, ServerDashboard, stat-card, StaffManager, OwnerTabs |
| `components/vk/` | VkMiniAppShell, RestaurantVkNotify |

### Уборка корня (Etap 3)
- Орфанные CSS-одноразовики → `archive/`: `_extract_css.py`, `recolor-palette.js`
  (нигде не используются; удалить отдельным коммитом после подтверждения).
- Рабочие доки → `docs/`: CHANGES, STYLE-MAP, FONTS-AUDIT, FONTS-CHANGES,
  BOOKING-FORM-CHANGES.
- `.gitignore` уже покрывает артефакты (`*.log`, `/*.png`, `.next/`,
  `node_modules/`, `tsbuildinfo`) — поэтому qa/mobile-скриншоты и логи в репозиторий
  не попадали.
- **Не трогали:** `scripts/` (`deploy.sh` — несущий: живой деплой синхронизируется
  из него; `init-db.mjs` / `enrich-restaurant-content.mjs` — в `package.json`),
  `README.md`, `MOBILE_APPS.md` (README ссылается на последний).

### Типографика (на этой же ветке)
Сведено к словарю `--font-serif`/`--font-sans`/`--font-mono` (см.
[FONTS-CHANGES.md](FONTS-CHANGES.md)).

## Не сделано (по согласованию)
**Разнос `globals.css` на партиалы (Etap 1) — отложен.** Файл — это
хронологические слои-полировки с дублями и `!important`, завязанные на порядок;
разрезать можно только строго последовательными слайсами (домены = переупорядочивание
= сломанный каскад). Польза косметическая, риск (порядок при сборке Turbopack)
нетривиальный, дедуп вне задачи. Делать только с гейтом: байт-идентичная
конкатенация + сравнение скриншотов до/после.

## Как проверить
- `tsc --noEmit` и `npm run build` — зелёные.
- Импорты: нет `@/components/<голыйФайл>` без домена
  (`grep -rE '"@/components/[A-Za-z0-9_-]+"' src` → пусто).
- Ключевые экраны (главная/каталог/профиль/бронь/кабинет/админка/VK Mini) на
  360/768/1440 — без визуальных отличий (перемещения файлов рендер не меняют).

## Откат
Вся работа в ветке `refactor/structure-css` поверх `fonts-unify`. Откат —
`git revert` соответствующих коммитов или сброс ветки; перемещения — обычные
git-rename (история сохранена).
