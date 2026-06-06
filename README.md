# Kaifbook

MVP SaaS-системы бронирования ресторанов с публичным клиентским сайтом и отдельным служебным кабинетом для ресторанов и админа.

## Позиционирование

Это система, которая помогает ресторану получать брони без хаоса, видеть загрузку зала, не терять гостей и понимать, какие дни приносят больше посадок. Ресторан получает готовую страницу бронирования, CRM гостей, аналитику, схему зала и удобный кабинет менеджера.

## Стек

- Next.js App Router 16
- React 19
- Prisma ORM
- SQLite для локального MVP
- Cookie-сессия на JWT

## Запуск

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Переменные окружения

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-a-long-random-string"
AI_PROVIDER="mock"
```

## Демо-доступ

```text
Ресторан:
demo@restaurant.local
demo12345

Владелец каталога:
owner@kaifbook.ru
demo12345

Админ:
admin@kaifbook.ru
demo12345
```

Демо-ресторан: `Ресторан «Лето»`. В seed добавлены гости, 30 броней за последние 14 дней, повторные гости, no-show, события страницы, рекомендации, меню, зал и 10 столов.

## Главные сценарии

- Клиент открывает `/restaurants`, выбирает ресторан и бронирует без регистрации.
- Заявка привязывается к нормализованному телефону клиента.
- Если customer-пользователя с телефоном нет, система создает техническую учетку `phone-<digits>@customers.kaifbook.local`.
- Внутри ресторана создается или обновляется CRM-гость по телефону.
- Ресторан видит новую заявку в `/owner/restaurants/:id/reservations` и может подтвердить, посадить, завершить, отклонить, отменить или отметить no-show.
- Dashboard и аналитика считают показатели из реальных таблиц брони, гостей, столов и событий страницы.

## Публичные страницы

- `/`
- `/restaurants`
- `/restaurants/:slug`
- `/restaurants/:slug/book`
- `/restaurants/:slug/reserve`
- `/r/:slug/book`
- `/for-restaurants`

## Служебные страницы

- `/owner/login`
- `/owner/register`
- `/owner/dashboard`
- `/owner/restaurants`
- `/owner/restaurants/new`
- `/owner/restaurants/:id/edit`
- `/owner/restaurants/:id/reservations`
- `/owner/restaurants/:id/guests`
- `/owner/restaurants/:id/guests/:guestId`
- `/owner/restaurants/:id/analytics`
- `/owner/restaurants/:id/recommendations`
- `/owner/restaurants/:id/menu`
- `/owner/restaurants/:id/halls`
- `/owner/restaurants/:id/working-hours`
- `/owner/restaurants/:id/settings`
- `/admin`
- `/admin/restaurants`
- `/admin/users`
- `/admin/reservations`
- `/admin/leads`
- `/admin/subscriptions`

## API

Public:

- `GET /api/public/restaurants`
- `GET /api/public/restaurants/:slug`
- `POST /api/public/restaurants/:slug/reservations`
- `POST /api/public/restaurant-leads`

Owner:

- `GET /api/owner/dashboard`
- `GET /api/owner/restaurants`
- `POST /api/owner/restaurants`
- `GET /api/owner/restaurants/:id`
- `PUT /api/owner/restaurants/:id`
- `GET /api/owner/restaurants/:id/analytics`
- `GET /api/owner/restaurants/:id/recommendations`
- `GET /api/owner/restaurants/:id/guests`
- `GET /api/owner/restaurants/:id/reservations`
- `PATCH /api/owner/reservations/:id/confirm`
- `PATCH /api/owner/reservations/:id/reject`
- `PATCH /api/owner/reservations/:id/seated`
- `PATCH /api/owner/reservations/:id/complete`
- `PATCH /api/owner/reservations/:id/no-show`

Legacy/совместимые endpoints старого MVP остаются доступными для меню, залов, рабочих часов, бронирований и админки.

## Что продавать ресторанам

- Гость бронирует стол без регистрации и лишних шагов.
- Все заявки попадают в один кабинет, менеджер не теряет звонки и сообщения.
- Телефон гостя автоматически попадает в CRM, ресторан видит повторы, no-show и историю.
- Владелец видит загрузку, слабые дни, популярные часы, источники броней и конверсию.
- Ресторан получает готовую ссылку `/r/:slug/book` для VK, Telegram, 2ГИС, Яндекс Карт, сайта и QR-кодов.

## TODO после MVP

- SMS/Telegram/email-уведомления и подтверждение телефона.
- Реальный QR-генератор и embeddable widget.
- Платежи, подписки и биллинг.
- Роли сотрудников внутри одного ресторана.
- Интеграции с VK/Telegram/2ГИС/Яндекс.
- Отзывы, акции и мультифилиальность сетей.
