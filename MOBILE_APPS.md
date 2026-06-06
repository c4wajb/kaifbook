# Мобильные приложения Kaifbook

В проект добавлена нативная оболочка на Capacitor для Android и iOS.

## Что внутри

- `capacitor.config.ts` — общий конфиг приложения.
- `android/` — Android-проект для Android Studio.
- `ios/` — iOS-проект для Xcode.
- `public/index.html` — fallback-экран, если сайт не загрузился.

Приложение открывает прод-сайт:

```text
https://www.stolix.ru
```

Это сделано намеренно: текущий Next.js проект использует серверные страницы, API и Prisma, поэтому его нельзя безопасно собрать как полностью статическое offline-приложение без отдельной переделки.

## Идентификаторы

- App name: `Kaifbook`
- Android applicationId: `ru.kaifbook.app`
- iOS bundle id: `ru.kaifbook.app`

Если нужен другой bundle id, поменяйте `appId` в `capacitor.config.ts`, затем выполните:

```bash
npm run mobile:sync
```

## Команды

Синхронизировать нативные проекты после изменений:

```bash
npm run mobile:sync
```

Открыть Android-проект:

```bash
npm run mobile:open:android
```

Открыть iOS-проект:

```bash
npm run mobile:open:ios
```

## Android release

Требуется Android Studio и JDK.

1. Выполнить:

```bash
npm run mobile:sync
npm run mobile:open:android
```

2. В Android Studio открыть `Build > Generate Signed Bundle / APK`.
3. Создать или выбрать keystore.
4. Собрать `.aab` для Google Play или `.apk` для ручной установки.

## iOS release

Требуется macOS, Xcode и Apple Developer account.

1. На Mac выполнить:

```bash
npm install
npm run mobile:sync
npm run mobile:open:ios
```

2. В Xcode выбрать Team, Signing & Capabilities.
3. Проверить bundle id `ru.kaifbook.app`.
4. Собрать Archive и отправить в App Store Connect.

## Авторизация VK ID

Так как приложение открывает `https://www.stolix.ru`, VK ID продолжает использовать текущий redirect:

```text
https://www.stolix.ru/api/guest-auth/vkid/callback
```

В `capacitor.config.ts` добавлены разрешённые домены для VK/MAX:

- `id.vk.ru`
- `vk.com`
- `max.ru`

## Что нужно проверить перед публикацией

- Вход в “Мои брони”.
- VK ID login.
- Fallback вход через MAX/VK-сообщество.
- Открытие карточки ресторана.
- Бронирование.
- QR-код брони.
- Галерея и меню.
- Поведение при слабом интернете.

## Ограничение MVP

Это webview-приложение. Для первого релиза и тестирования это быстро и безопасно. Для App Store может потребоваться больше нативной ценности: push-уведомления, нативная авторизация, сохранение брони в Wallet/Calendar или отдельный экран “Мои брони” на нативной стороне.
