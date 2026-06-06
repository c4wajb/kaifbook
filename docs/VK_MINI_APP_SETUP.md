# VK Mini App для Kaifbook

## Что добавлено

- Каталог: `/vk-mini`
- Карточка ресторана: `/vk-mini/restaurants/:slug`
- Бронирование: `/vk-mini/restaurants/:slug/booking`
- Мои брони: `/vk-mini/bookings`
- Backend session endpoint: `POST /api/vk-mini/session`

В mini-app не подключаются Reserve Office, админка и ресторанный кабинет.

## URL для VK

В кабинете VK Mini Apps укажите:

- URL приложения: `https://kaifbook.ru/vk-mini`
- Privacy Policy: `https://kaifbook.ru/privacy`
- Terms: `https://kaifbook.ru/terms`

Если используете второй домен:

- URL приложения: `https://www.stolix.ru/vk-mini`
- Privacy Policy: `https://www.stolix.ru/privacy`
- Terms: `https://www.stolix.ru/terms`

## Переменные окружения

```env
NEXT_PUBLIC_VK_APP_ID="id mini app"
VK_APP_ID="id mini app"
VK_APP_SECRET="защищенный ключ mini app"
NEXT_PUBLIC_VK_MINI_APP_URL="https://kaifbook.ru/vk-mini"
```

`VK_APP_SECRET` нужен для проверки подписи launch params. Без него приложение работает в браузерном/dev-режиме, но `isVerified` будет `false`.

## Как работает сессия

1. Клиентский код вызывает `VKWebAppInit` через `@vkontakte/vk-bridge`.
2. Launch params отправляются на `/api/vk-mini/session`.
3. Сервер проверяет `sign`, если задан `VK_APP_SECRET`.
4. Сервер возвращает короткоживущий JWT на 2 часа.

Этот JWT сейчас используется как технический признак запуска mini-app. Гостевой кабинет продолжает подтверждать пользователя через уже существующий вход по VK ID / VK-сообществу / MAX.

## Источник брони

Заявки, отправленные из `/vk-mini/restaurants/:slug/booking`, сохраняются с:

```txt
source = "vk-mini-app"
```

Обычный сайт продолжает сохранять:

```txt
source = "web"
```

## Проверка перед публикацией

1. Открыть `https://kaifbook.ru/vk-mini`.
2. Проверить список ресторанов и фильтры.
3. Открыть ресторан.
4. Отправить тестовую бронь.
5. Убедиться в Reserve Office, что у брони `source = vk-mini-app`.
6. Открыть `/vk-mini/bookings`.
7. Проверить вход и отображение брони.
8. Проверить `https://kaifbook.ru/privacy` и `https://kaifbook.ru/terms`.

## Ограничения MVP

- Mini-app не содержит ресторанный кабинет и админку.
- Автоматическая авторизация гостя по VK launch params не включена. Для просмотра броней используется текущий гостевой вход.
- Сервер проверяет подпись launch params только при наличии `VK_APP_SECRET`.
