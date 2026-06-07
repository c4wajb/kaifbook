# Kaifbook

Система бронирования ресторанов: публичный клиентский сайт, кабинет ресторана, админка, гостевой портал, VK Mini App и нативные мобильные оболочки. Гость бронирует стол без регистрации, ресторан получает заявку, телефон и историю визитов, а владелец видит загрузку, конверсию и точки роста.

## Возможности

- **Каталог и карточка ресторана** — фильтры, поиск, баннер-слайдер; галерея, меню, отзывы, часы работы, карта, бронирование.
- **Бронирование без регистрации** — заявка привязывается к нормализованному телефону; короткая ссылка `/r/:slug/book` для VK/Telegram/2ГИС/Яндекс/QR.
- **Возрастной гейт 18+** — для заведений с кальяном/табаком гость подтверждает возраст вводом даты рождения (проверка реального возраста, отсев несуществующих дат вроде 31 февраля).
- **Гостевой портал** (`/guest`) — вход по телефону (SMS-код) или VK ID, «Мои брони», подтверждение брони по ссылке/токену.
- **Кабинет ресторана** — дашборд, лента заявок со статусами (подтвердить / посадить / завершить / отклонить / отменить / no-show), CRM гостей, аналитика, рекомендации, меню, схема зала со столами, рабочие часы, сотрудники с ролями, история броней, настройки и правила no-show, депозиты с мок-оплатой.
- **Админка** — рестораны, пользователи, брони, лиды, подписки, серверный мониторинг, API-документация.
- **Интеграции** — VK ID (вход), VK Mini App, подтверждение брони через VK/MAX (webhooks), демо-режим SMS-кода.
- **Мобильные приложения** — Android/iOS через Capacitor (см. `MOBILE_APPS.md`).

## Стек

- Next.js 16 (App Router) + React 19
- Prisma 6 ORM + **PostgreSQL 16**
- Cookie-сессии на JWT (`jose`)
- Валидация: `zod` · иконки: `lucide-react` · QR: `qrcode`
- VK Bridge / VK ID SDK для VK Mini App и входа
- Capacitor для нативных Android/iOS-оболочек
- Docker / Docker Compose для локального запуска и продакшена

## Запуск

### Через Docker Compose (рекомендуется)

`docker-compose.yml` поднимает PostgreSQL, прогоняет миграции и запускает приложение:

```bash
docker compose up --build
```

Приложение: [http://localhost:3000](http://localhost:3000). База поднимается уже с применёнными миграциями, но пустая — демо-данные удобнее залить из локального окружения (см. ниже), указав `DATABASE_URL` на контейнерный Postgres (`...@localhost:5432/kaifbook`) и выполнив `npm run prisma:seed`.

### Локальная разработка (dev-сервер + Postgres в Docker)

```bash
docker compose up -d postgres                      # только база
cp .env.example .env                               # и пропишите DATABASE_URL (см. ниже)
npm install
npm run prisma:deploy                              # применить миграции
npm run prisma:seed                                # демо-данные
npm run dev
```

> Схема использует PostgreSQL — `DATABASE_URL` должен начинаться с `postgresql://`. Старый SQLite (`file:./dev.db`) больше не поддерживается.

## Переменные окружения

Минимум для локального запуска:

```env
DATABASE_URL="postgresql://kaifbook:CHANGE_ME@localhost:5432/kaifbook"
SESSION_SECRET="replace-with-a-long-random-string"
APP_PUBLIC_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# COOKIE_SECURE=true   # включать за HTTPS в проде
```

Опциональные интеграции (полный список и комментарии — в `.env.example`): подтверждение брони через VK/MAX (`VK_*`, `MAX_*`), вход VK ID (`VK_ID_*`, `NEXT_PUBLIC_VK_ID_APP_ID`), VK Mini App (`VK_APP_*`, `NEXT_PUBLIC_VK_APP_ID`), демо-SMS (`SMS_DEMO_CODE`, `SMS_PROVIDER`).

## Демо-доступ

```text
Ресторан-менеджер:  demo@restaurant.local / demo12345
Владелец каталога:  owner@kaifbook.ru     / demo12345
Админ:              admin@kaifbook.ru     / demo12345
```

Seed создаёт несколько ресторанов (включая демо `Ресторан «Лето»`), гостей, брони за последние недели, повторных гостей и no-show, события страниц, рекомендации, меню, залы и столы.

## Главные сценарии

- Клиент открывает `/restaurants`, выбирает ресторан и бронирует без регистрации.
- Заявка привязывается к нормализованному телефону; при отсутствии customer-пользователя создаётся техническая учётка `phone-<digits>@customers.kaifbook.local`.
- Внутри ресторана создаётся/обновляется CRM-гость по телефону.
- Ресторан видит заявку в `/owner/restaurants/:id/reservations` и меняет её статус (подтвердить, посадить, завершить, отклонить, отменить, no-show).
- Для заведений 18+ перед просмотром показывается подтверждение возраста по дате рождения.
- Dashboard и аналитика считают показатели из реальных таблиц брони, гостей, столов и событий.

## Маршруты

**Публичные:** `/` · `/restaurants` · `/restaurants/:slug` · `/restaurants/:slug/menu` · `/restaurants/:slug/book` · `/restaurants/:slug/reserve` · `/r/:slug/book` · `/reservation/confirm/:token` · `/payment/mock/:paymentId` · `/for-restaurants` · `/privacy` · `/terms`

**Гость:** `/guest` · `/guest/login` · `/guest/reservations`

**VK Mini App:** `/vk-mini` · `/vk-mini/restaurants/:slug` · `/vk-mini/restaurants/:slug/booking` · `/vk-mini/bookings` (см. `docs/VK_MINI_APP_SETUP.md`)

**Кабинет ресторана:** `/owner/login` · `/owner/register` · `/owner/dashboard` · `/owner/restaurants` (+ `/new`) · `/owner/restaurants/:id/edit` · `/reservations` · `/reservation-history` · `/guests` (+ `/:guestId`) · `/analytics` · `/recommendations` · `/menu` · `/halls` · `/staff` · `/working-hours` · `/no-show` · `/settings`

**Админка:** `/admin` · `/admin/restaurants` · `/admin/users` · `/admin/reservations` · `/admin/leads` · `/admin/subscriptions` · `/admin/server` · `/admin/api-docs`

## API

Полная интерактивная документация — на странице `/admin/api-docs`. Основное:

- **Public:** `GET /api/public/restaurants`, `GET /api/public/restaurants/:slug`, `GET /api/public/restaurants/:slug/availability`, `POST /api/public/restaurants/:slug/reservations`, `POST /api/public/restaurant-leads`
- **Owner:** `GET /api/owner/dashboard`, `GET|POST /api/owner/restaurants`, `GET|PUT /api/owner/restaurants/:id`, `.../analytics`, `.../guests`, `.../reservations`, и переходы статуса `PATCH /api/owner/reservations/:id/{confirm|reject|seated|complete|no-show}`
- **Guest / интеграции:** вход по телефону и VK ID, сессия VK Mini App (`/api/vk-mini/session`), webhooks `/api/webhooks/{vk,max}`, мок-оплата депозита

Совместимые endpoints старого MVP остаются доступными для меню, залов, рабочих часов и админки.

## Деплой

Продакшен собирается в Docker-образ (`Dockerfile`, Next.js `output: "standalone"`) и запускается вместе с PostgreSQL через `docker-compose.yml` (сервисы `postgres` → `migrate` → `app`). Приложение слушает `127.0.0.1:3000` и публикуется за обратным прокси. Все секреты (`DATABASE_URL`, `SESSION_SECRET`, токены VK/MAX) задаются через окружение и в репозиторий не коммитятся.

## Дальнейшие планы

- Боевые SMS/Telegram/email-уведомления (сейчас демо-код и подтверждение через VK/MAX).
- Реальный платёжный провайдер вместо мок-оплаты депозитов.
- Расширение аналитики и отчётов.
- Мультифилиальность сетей и публичные отзывы от гостей.
