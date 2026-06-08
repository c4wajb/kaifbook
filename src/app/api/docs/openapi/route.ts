import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Kaifbook API",
    version: "1.0.0",
    description: "API платформы бронирования ресторанов Kaifbook",
  },
  servers: [
    { url: "https://www.kaifbook.ru", description: "Production" },
    { url: "http://localhost:3000", description: "Development" },
  ],
  tags: [
    { name: "Auth", description: "Аутентификация и авторизация" },
    { name: "Public — Restaurants", description: "Публичный каталог ресторанов" },
    { name: "Public — Reservations", description: "Бронирование и подтверждение" },
    { name: "Public — Payments", description: "Оплата депозитов" },
    { name: "Public — Leads", description: "Заявки на подключение" },
    { name: "Owner — Dashboard", description: "Кабинет владельца" },
    { name: "Owner — Restaurants", description: "Управление ресторанами" },
    { name: "Owner — Reservations", description: "Управление бронями" },
    { name: "Owner — Menu", description: "Управление меню" },
    { name: "Owner — Halls", description: "Управление залами и столами" },
    { name: "Owner — Guests", description: "Гости и аналитика" },
    { name: "Owner — Settings", description: "Настройки депозитов, no-show, типы столов" },
    { name: "Admin", description: "Админ-панель платформы" },
    { name: "Uploads", description: "Загрузка изображений" },
    { name: "Webhooks", description: "Вебхуки VK и MAX" },
    { name: "Verifications", description: "Верификация телефона через мессенджеры" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "restaurant_mvp_session",
        description: "JWT-токен в cookie",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "fullName", "phone"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          fullName: { type: "string", minLength: 2 },
          phone: { type: "string", minLength: 5 },
          role: { type: "string", enum: ["restaurant_owner", "restaurant_manager", "customer"], default: "customer" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          fullName: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", enum: ["admin", "platform_admin", "restaurant_owner", "restaurant_manager", "restaurant_staff", "customer", "guest"] },
        },
      },
      Restaurant: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          shortDescription: { type: "string" },
          city: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string", nullable: true },
          averageCheck: { type: "integer" },
          cuisineTypes: { type: "array", items: { type: "string" } },
          features: { type: "array", items: { type: "string" } },
          mainPhotoUrl: { type: "string", nullable: true },
          galleryPhotos: { type: "array", items: { type: "string" } },
          rating: { type: "number", nullable: true },
          reviewCount: { type: "integer" },
          isActive: { type: "boolean" },
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
        },
      },
      RestaurantCreate: {
        type: "object",
        required: ["title", "description", "shortDescription", "city", "address", "phone", "email", "averageCheck"],
        properties: {
          title: { type: "string", minLength: 2 },
          slug: { type: "string" },
          description: { type: "string", minLength: 10 },
          shortDescription: { type: "string", minLength: 5 },
          city: { type: "string", minLength: 2 },
          address: { type: "string", minLength: 3 },
          phone: { type: "string", minLength: 3 },
          email: { type: "string", format: "email" },
          website: { type: "string", nullable: true },
          averageCheck: { type: "integer", minimum: 1 },
          cuisineTypes: { type: "array", items: { type: "string" } },
          features: { type: "array", items: { type: "string" } },
          mainPhotoUrl: { type: "string", nullable: true },
          galleryPhotos: { type: "array", items: { type: "string" } },
        },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "string" },
          restaurantId: { type: "string" },
          hallId: { type: "string", nullable: true },
          tableId: { type: "string", nullable: true },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerEmail: { type: "string", nullable: true },
          guestsCount: { type: "integer" },
          reservationDate: { type: "string", format: "date" },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          endTime: { type: "string", nullable: true },
          status: { type: "string", enum: ["new", "awaiting_restaurant_confirmation", "confirmed_by_restaurant", "awaiting_deposit_payment", "deposit_paid", "confirmed_by_guest", "confirmed", "seated", "cancelled_by_guest", "cancelled_by_restaurant", "payment_expired", "rejected", "cancelled", "completed", "no_show"] },
          comment: { type: "string", nullable: true },
          occasion: { type: "string", nullable: true },
          source: { type: "string", enum: ["web", "vk-mini-app"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ReservationCreate: {
        type: "object",
        required: ["customerName", "customerPhone", "guestsCount", "reservationDate", "startTime"],
        properties: {
          hallId: { type: "string", nullable: true },
          tableId: { type: "string", nullable: true },
          selectedSeatNumbers: { type: "array", items: { type: "string" }, nullable: true },
          customerName: { type: "string", minLength: 2 },
          customerPhone: { type: "string", description: "Российский номер телефона" },
          customerEmail: { type: "string", format: "email", nullable: true },
          guestsCount: { type: "integer", minimum: 1 },
          reservationDate: { type: "string", format: "date", description: "YYYY-MM-DD" },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$", description: "HH:MM" },
          endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$", nullable: true },
          verificationSessionId: { type: "string", nullable: true },
          source: { type: "string", enum: ["web", "vk-mini-app"] },
          occasion: { type: "string", nullable: true },
          comment: { type: "string", nullable: true },
        },
      },
      Hall: {
        type: "object",
        properties: {
          id: { type: "string" },
          restaurantId: { type: "string" },
          title: { type: "string" },
          width: { type: "integer" },
          height: { type: "integer" },
          sortOrder: { type: "integer" },
          isActive: { type: "boolean" },
          tables: { type: "array", items: { $ref: "#/components/schemas/Table" } },
          objects: { type: "array", items: { $ref: "#/components/schemas/HallObject" } },
        },
      },
      Table: {
        type: "object",
        properties: {
          id: { type: "string" },
          hallId: { type: "string" },
          number: { type: "string" },
          seats: { type: "integer" },
          tableTypeId: { type: "string", nullable: true },
          bookingPrice: { type: "integer", nullable: true },
          depositAmount: { type: "integer", nullable: true },
          depositRequired: { type: "boolean", nullable: true },
          shape: { type: "string", enum: ["rectangle", "circle", "square"] },
          x: { type: "integer" },
          y: { type: "integer" },
          width: { type: "integer" },
          height: { type: "integer" },
          rotation: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      HallObject: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["bar", "toilet", "entrance", "exit", "stage", "wall", "partition", "column", "kitchen", "wardrobe", "dancefloor", "sofa", "window", "zone", "custom"] },
          label: { type: "string" },
          x: { type: "integer" },
          y: { type: "integer" },
          width: { type: "integer" },
          height: { type: "integer" },
          rotation: { type: "integer" },
          shape: { type: "string", enum: ["rectangle", "square", "circle", "oval", "line"] },
          icon: { type: "string", nullable: true },
          color: { type: "string", nullable: true },
          zIndex: { type: "integer" },
          isLocked: { type: "boolean" },
          isVisible: { type: "boolean" },
        },
      },
      MenuCategory: {
        type: "object",
        properties: {
          id: { type: "string" },
          restaurantId: { type: "string" },
          title: { type: "string" },
          sortOrder: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      MenuItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          restaurantId: { type: "string" },
          categoryId: { type: "string", nullable: true },
          title: { type: "string" },
          description: { type: "string" },
          price: { type: "integer" },
          weight: { type: "string", nullable: true },
          photoUrl: { type: "string", nullable: true },
          isAvailable: { type: "boolean" },
          sortOrder: { type: "integer" },
        },
      },
      TableType: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          code: { type: "string" },
          description: { type: "string", nullable: true },
          minGuests: { type: "integer" },
          maxGuests: { type: "integer" },
          defaultDepositAmount: { type: "integer" },
          defaultBookingPrice: { type: "integer" },
          isDepositRequired: { type: "boolean" },
          isActive: { type: "boolean" },
        },
      },
      RestaurantLead: {
        type: "object",
        required: ["restaurantName", "contactName", "phone", "email", "city"],
        properties: {
          restaurantName: { type: "string", minLength: 2 },
          contactName: { type: "string", minLength: 2 },
          phone: { type: "string", minLength: 5 },
          email: { type: "string", format: "email" },
          city: { type: "string", minLength: 2 },
          address: { type: "string", nullable: true },
          comment: { type: "string", nullable: true },
        },
      },
      Availability: {
        type: "object",
        properties: {
          date: { type: "string", format: "date" },
          slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                available: { type: "boolean" },
                tables: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ===== Auth =====
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Вход в систему",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          "200": { description: "Успешный вход", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          "401": { description: "Неверные учётные данные" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Регистрация",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: {
          "201": { description: "Аккаунт создан", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          "409": { description: "Email уже используется" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Текущий пользователь",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Данные пользователя", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          "401": { description: "Не авторизован" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Выход из системы",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Сессия завершена" } },
      },
    },

    // ===== Public Restaurants =====
    "/api/public/restaurants": {
      get: {
        tags: ["Public — Restaurants"],
        summary: "Каталог ресторанов",
        parameters: [
          { name: "city", in: "query", schema: { type: "string" }, description: "Фильтр по городу" },
          { name: "cuisine", in: "query", schema: { type: "string" }, description: "Фильтр по кухне" },
          { name: "feature", in: "query", schema: { type: "string" }, description: "Фильтр по особенности" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Поиск по названию" },
          { name: "minCheck", in: "query", schema: { type: "integer" }, description: "Минимальный средний чек" },
          { name: "maxCheck", in: "query", schema: { type: "integer" }, description: "Максимальный средний чек" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["rating", "price_asc", "price_desc", "newest"] } },
        ],
        responses: {
          "200": { description: "Список ресторанов", content: { "application/json": { schema: { type: "object", properties: { restaurants: { type: "array", items: { $ref: "#/components/schemas/Restaurant" } } } } } } },
        },
      },
    },
    "/api/public/restaurants/{slug}": {
      get: {
        tags: ["Public — Restaurants"],
        summary: "Страница ресторана",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Данные ресторана с залами и меню", content: { "application/json": { schema: { type: "object", properties: { restaurant: { $ref: "#/components/schemas/Restaurant" }, halls: { type: "array", items: { $ref: "#/components/schemas/Hall" } }, menu: { type: "array", items: { $ref: "#/components/schemas/MenuItem" } } } } } } },
          "404": { description: "Ресторан не найден" },
        },
      },
    },
    "/api/public/restaurants/{slug}/availability": {
      get: {
        tags: ["Public — Restaurants"],
        summary: "Доступность столов",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "guests", in: "query", schema: { type: "integer" } },
          { name: "hallId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Слоты доступности", content: { "application/json": { schema: { $ref: "#/components/schemas/Availability" } } } } },
      },
    },
    "/api/public/restaurants/{slug}/reservations": {
      post: {
        tags: ["Public — Reservations"],
        summary: "Создать бронь",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReservationCreate" } } } },
        responses: {
          "201": { description: "Бронь создана", content: { "application/json": { schema: { type: "object", properties: { reservation: { $ref: "#/components/schemas/Reservation" } } } } } },
          "400": { description: "Ошибка валидации" },
          "409": { description: "Стол уже занят" },
        },
      },
    },
    "/api/public/restaurants/{slug}/calculate-reservation-price": {
      post: {
        tags: ["Public — Reservations"],
        summary: "Расчёт стоимости бронирования",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { tableId: { type: "string" }, guestsCount: { type: "integer" }, reservationDate: { type: "string" }, startTime: { type: "string" } } } } } },
        responses: { "200": { description: "Цена и депозит", content: { "application/json": { schema: { type: "object", properties: { bookingPrice: { type: "integer" }, depositAmount: { type: "integer" }, depositRequired: { type: "boolean" } } } } } } },
      },
    },

    // ===== Reservation Confirmation =====
    "/api/public/reservations/confirm/{token}": {
      get: {
        tags: ["Public — Reservations"],
        summary: "Получить данные брони по токену",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Данные брони для подтверждения" }, "404": { description: "Бронь не найдена" } },
      },
    },
    "/api/public/reservations/confirm/{token}/accept": {
      post: {
        tags: ["Public — Reservations"],
        summary: "Подтвердить бронь гостем",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Бронь подтверждена" } },
      },
    },
    "/api/public/reservations/confirm/{token}/cancel": {
      post: {
        tags: ["Public — Reservations"],
        summary: "Отменить бронь гостем",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Бронь отменена" } },
      },
    },
    "/api/public/reservations/confirm/{token}/reschedule": {
      post: {
        tags: ["Public — Reservations"],
        summary: "Перенести бронь",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { reservationDate: { type: "string", format: "date" }, startTime: { type: "string" } } } } } },
        responses: { "200": { description: "Бронь перенесена" } },
      },
    },
    "/api/public/reservations/confirm/{token}/qr": {
      get: {
        tags: ["Public — Reservations"],
        summary: "QR-код брони (PNG)",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PNG изображение QR-кода", content: { "image/png": {} } } },
      },
    },

    // ===== Payments =====
    "/api/public/reservations/{reservationId}/pay-deposit": {
      post: {
        tags: ["Public — Payments"],
        summary: "Оплатить депозит",
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "URL для оплаты", content: { "application/json": { schema: { type: "object", properties: { paymentUrl: { type: "string" } } } } } } },
      },
    },
    "/api/public/payments/{paymentId}/status": {
      get: {
        tags: ["Public — Payments"],
        summary: "Статус платежа",
        parameters: [{ name: "paymentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статус", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["pending", "waiting_for_payment", "paid", "failed", "cancelled", "refunded", "expired"] } } } } } } },
      },
    },

    // ===== Leads =====
    "/api/public/restaurant-leads": {
      post: {
        tags: ["Public — Leads"],
        summary: "Подать заявку на подключение ресторана",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RestaurantLead" } } } },
        responses: { "201": { description: "Заявка создана" } },
      },
    },

    // ===== Owner Dashboard =====
    "/api/owner/dashboard": {
      get: {
        tags: ["Owner — Dashboard"],
        summary: "Статистика кабинета владельца",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Агрегированная статистика по ресторанам" } },
      },
    },

    // ===== Owner Restaurants =====
    "/api/owner/restaurants": {
      get: {
        tags: ["Owner — Restaurants"],
        summary: "Мои рестораны",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список ресторанов владельца", content: { "application/json": { schema: { type: "object", properties: { restaurants: { type: "array", items: { $ref: "#/components/schemas/Restaurant" } } } } } } } },
      },
      post: {
        tags: ["Owner — Restaurants"],
        summary: "Создать ресторан",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RestaurantCreate" } } } },
        responses: { "201": { description: "Ресторан создан", content: { "application/json": { schema: { type: "object", properties: { restaurant: { $ref: "#/components/schemas/Restaurant" } } } } } } },
      },
    },
    "/api/owner/restaurants/{restaurantId}": {
      get: {
        tags: ["Owner — Restaurants"],
        summary: "Данные ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Ресторан", content: { "application/json": { schema: { type: "object", properties: { restaurant: { $ref: "#/components/schemas/Restaurant" } } } } } } },
      },
      put: {
        tags: ["Owner — Restaurants"],
        summary: "Обновить ресторан",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RestaurantCreate" } } } },
        responses: { "200": { description: "Ресторан обновлён" } },
      },
    },

    // ===== Owner Reservations =====
    "/api/owner/restaurants/{restaurantId}/reservations": {
      get: {
        tags: ["Owner — Reservations"],
        summary: "Брони ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "restaurantId", in: "path", required: true, schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Список броней", content: { "application/json": { schema: { type: "object", properties: { reservations: { type: "array", items: { $ref: "#/components/schemas/Reservation" } } } } } } } },
      },
    },
    "/api/owner/reservations/{reservationId}/confirm": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Подтвердить бронь рестораном",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Бронь подтверждена" } },
      },
    },
    "/api/owner/reservations/{reservationId}/reject": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Отклонить бронь",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { rejectionReason: { type: "string" } } } } } },
        responses: { "200": { description: "Бронь отклонена" } },
      },
    },
    "/api/owner/reservations/{reservationId}/cancel": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Отменить бронь",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Бронь отменена" } },
      },
    },
    "/api/owner/reservations/{reservationId}/seated": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Отметить гостя как посаженного",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статус обновлён" } },
      },
    },
    "/api/owner/reservations/{reservationId}/complete": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Завершить бронь",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Бронь завершена" } },
      },
    },
    "/api/owner/reservations/{reservationId}/no-show": {
      patch: {
        tags: ["Owner — Reservations"],
        summary: "Отметить no-show",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Отмечено как no-show" } },
      },
    },
    "/api/owner/reservations/{reservationId}/request-confirmation": {
      post: {
        tags: ["Owner — Reservations"],
        summary: "Запросить подтверждение от гостя",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Запрос отправлен" } },
      },
    },
    "/api/owner/reservations/{reservationId}/mark-payment-paid": {
      post: {
        tags: ["Owner — Reservations"],
        summary: "Отметить депозит как оплаченный",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "reservationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Оплата отмечена" } },
      },
    },

    // ===== Owner Halls =====
    "/api/restaurants/{restaurantId}/halls": {
      get: {
        tags: ["Owner — Halls"],
        summary: "Залы ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Список залов с столами", content: { "application/json": { schema: { type: "object", properties: { halls: { type: "array", items: { $ref: "#/components/schemas/Hall" } } } } } } } },
      },
      post: {
        tags: ["Owner — Halls"],
        summary: "Создать зал",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, width: { type: "integer", default: 900 }, height: { type: "integer", default: 520 }, sortOrder: { type: "integer" } } } } } },
        responses: { "201": { description: "Зал создан" } },
      },
    },
    "/api/halls/{hallId}": {
      put: {
        tags: ["Owner — Halls"],
        summary: "Обновить зал",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "hallId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, width: { type: "integer" }, height: { type: "integer" } } } } } },
        responses: { "200": { description: "Зал обновлён" } },
      },
      delete: {
        tags: ["Owner — Halls"],
        summary: "Удалить зал",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "hallId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Зал удалён" }, "409": { description: "В зале есть активные брони" } },
      },
    },
    "/api/halls/{hallId}/layout": {
      put: {
        tags: ["Owner — Halls"],
        summary: "Сохранить схему зала (столы + объекты)",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "hallId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { hall: { type: "object", properties: { title: { type: "string" }, width: { type: "integer" }, height: { type: "integer" } } }, tables: { type: "array", items: { $ref: "#/components/schemas/Table" } }, objects: { type: "array", items: { $ref: "#/components/schemas/HallObject" } } } } } } },
        responses: { "200": { description: "Схема сохранена", content: { "application/json": { schema: { type: "object", properties: { hall: { $ref: "#/components/schemas/Hall" } } } } } } },
      },
    },
    "/api/halls/{hallId}/tables": {
      post: {
        tags: ["Owner — Halls"],
        summary: "Добавить стол",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "hallId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Table" } } } },
        responses: { "201": { description: "Стол добавлен" } },
      },
    },
    "/api/halls/{hallId}/tables/{tableId}": {
      delete: {
        tags: ["Owner — Halls"],
        summary: "Удалить стол",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "hallId", in: "path", required: true, schema: { type: "string" } },
          { name: "tableId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Стол удалён" } },
      },
    },

    // ===== Owner Menu =====
    "/api/restaurants/{restaurantId}/menu": {
      get: {
        tags: ["Owner — Menu"],
        summary: "Полное меню ресторана",
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Категории и позиции", content: { "application/json": { schema: { type: "object", properties: { categories: { type: "array", items: { $ref: "#/components/schemas/MenuCategory" } }, items: { type: "array", items: { $ref: "#/components/schemas/MenuItem" } } } } } } } },
      },
    },
    "/api/restaurants/{restaurantId}/menu-categories": {
      post: {
        tags: ["Owner — Menu"],
        summary: "Создать категорию меню",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, sortOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } },
        responses: { "201": { description: "Категория создана" } },
      },
    },
    "/api/menu-categories/{categoryId}": {
      put: { tags: ["Owner — Menu"], summary: "Обновить категорию", security: [{ cookieAuth: [] }], parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
      delete: { tags: ["Owner — Menu"], summary: "Удалить категорию", security: [{ cookieAuth: [] }], parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Удалено" } } },
    },
    "/api/restaurants/{restaurantId}/menu-items": {
      post: {
        tags: ["Owner — Menu"],
        summary: "Создать позицию меню",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "price"], properties: { categoryId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, price: { type: "integer" }, weight: { type: "string" }, photoUrl: { type: "string" }, isAvailable: { type: "boolean" }, sortOrder: { type: "integer" } } } } } },
        responses: { "201": { description: "Позиция создана" } },
      },
    },
    "/api/menu-items/{itemId}": {
      put: { tags: ["Owner — Menu"], summary: "Обновить позицию меню", security: [{ cookieAuth: [] }], parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
      delete: { tags: ["Owner — Menu"], summary: "Удалить позицию меню", security: [{ cookieAuth: [] }], parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Удалено" } } },
    },
    "/api/restaurants/{restaurantId}/menu-qr": {
      get: {
        tags: ["Owner — Menu"],
        summary: "QR-код для меню (PNG)",
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PNG изображение QR-кода", content: { "image/png": {} } } },
      },
    },
    "/api/restaurants/{restaurantId}/menu-pdf": {
      get: {
        tags: ["Owner — Menu"],
        summary: "Меню в PDF",
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PDF файл", content: { "application/pdf": {} } } },
      },
    },

    // ===== Owner Guests & Analytics =====
    "/api/owner/restaurants/{restaurantId}/guests": {
      get: {
        tags: ["Owner — Guests"],
        summary: "Гостевая база ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "restaurantId", in: "path", required: true, schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Поиск по имени/телефону" },
        ],
        responses: { "200": { description: "Список гостей с историей визитов" } },
      },
    },
    "/api/owner/restaurants/{restaurantId}/guests/{guestId}/tags": {
      patch: {
        tags: ["Owner — Guests"],
        summary: "Обновить теги гостя",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "restaurantId", in: "path", required: true, schema: { type: "string" } },
          { name: "guestId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } } } } },
        responses: { "200": { description: "Теги обновлены" } },
      },
    },
    "/api/owner/restaurants/{restaurantId}/analytics": {
      get: {
        tags: ["Owner — Guests"],
        summary: "Аналитика ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статистика броней, гостей, выручки" } },
      },
    },
    "/api/owner/restaurants/{restaurantId}/recommendations": {
      get: {
        tags: ["Owner — Guests"],
        summary: "Рекомендации по улучшению",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Список рекомендаций" } },
      },
    },
    "/api/owner/restaurants/{restaurantId}/no-show-analytics": {
      get: {
        tags: ["Owner — Guests"],
        summary: "Аналитика no-show",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статистика no-show" } },
      },
    },
    "/api/owner/restaurants/{restaurantId}/deposit-analytics": {
      get: {
        tags: ["Owner — Guests"],
        summary: "Аналитика депозитов",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статистика депозитов" } },
      },
    },

    // ===== Owner Settings =====
    "/api/owner/restaurants/{restaurantId}/table-types": {
      get: {
        tags: ["Owner — Settings"],
        summary: "Типы столов",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Список типов столов", content: { "application/json": { schema: { type: "object", properties: { tableTypes: { type: "array", items: { $ref: "#/components/schemas/TableType" } } } } } } } },
      },
      post: {
        tags: ["Owner — Settings"],
        summary: "Создать тип стола",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TableType" } } } },
        responses: { "201": { description: "Тип создан" } },
      },
    },
    "/api/owner/table-types/{tableTypeId}": {
      put: { tags: ["Owner — Settings"], summary: "Обновить тип стола", security: [{ cookieAuth: [] }], parameters: [{ name: "tableTypeId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
      delete: { tags: ["Owner — Settings"], summary: "Удалить тип стола", security: [{ cookieAuth: [] }], parameters: [{ name: "tableTypeId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Удалено" } } },
    },
    "/api/owner/restaurants/{restaurantId}/booking-pricing-rules": {
      get: {
        tags: ["Owner — Settings"],
        summary: "Правила ценообразования",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Список правил" } },
      },
      post: {
        tags: ["Owner — Settings"],
        summary: "Создать правило ценообразования",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Правило создано" } },
      },
    },
    "/api/owner/booking-pricing-rules/{ruleId}": {
      put: { tags: ["Owner — Settings"], summary: "Обновить правило", security: [{ cookieAuth: [] }], parameters: [{ name: "ruleId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
      delete: { tags: ["Owner — Settings"], summary: "Удалить правило", security: [{ cookieAuth: [] }], parameters: [{ name: "ruleId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Удалено" } } },
    },
    "/api/owner/restaurants/{restaurantId}/deposit-settings": {
      get: { tags: ["Owner — Settings"], summary: "Настройки депозитов", security: [{ cookieAuth: [] }], parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Настройки" } } },
      put: { tags: ["Owner — Settings"], summary: "Обновить настройки депозитов", security: [{ cookieAuth: [] }], parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
    },
    "/api/owner/restaurants/{restaurantId}/no-show-settings": {
      get: { tags: ["Owner — Settings"], summary: "Настройки no-show", security: [{ cookieAuth: [] }], parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Настройки" } } },
      put: { tags: ["Owner — Settings"], summary: "Обновить настройки no-show", security: [{ cookieAuth: [] }], parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
    },
    "/api/restaurants/{restaurantId}/working-hours": {
      get: { tags: ["Owner — Settings"], summary: "Часы работы", parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Расписание" } } },
      put: { tags: ["Owner — Settings"], summary: "Обновить часы работы", security: [{ cookieAuth: [] }], parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Обновлено" } } },
    },

    // ===== Uploads =====
    "/api/owner/restaurants/{restaurantId}/uploads/image": {
      post: {
        tags: ["Uploads"],
        summary: "Загрузить изображение",
        description: "Загрузка до 12 изображений (JPG, PNG, WEBP, AVIF). Максимум 5 МБ на файл. Конвертируется в WebP.",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { files: { type: "array", items: { type: "string", format: "binary" } } } } } } },
        responses: { "201": { description: "URL загруженных файлов", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" }, urls: { type: "array", items: { type: "string" } } } } } } } },
      },
    },

    // ===== Admin =====
    "/api/admin/restaurants": {
      get: {
        tags: ["Admin"],
        summary: "Все рестораны (админ)",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список всех ресторанов" } },
      },
    },
    "/api/admin/restaurants/{restaurantId}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Изменить статус/настройки ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, isActive: { type: "boolean" }, isFeatured: { type: "boolean" }, bannerTitle: { type: "string" }, bannerSubtitle: { type: "string" }, bannerImage: { type: "string" } } } } } },
        responses: { "200": { description: "Обновлено" } },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Все пользователи",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список пользователей" } },
      },
    },
    "/api/admin/reservations": {
      get: {
        tags: ["Admin"],
        summary: "Все брони (админ)",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список всех броней" } },
      },
    },
    "/api/admin/leads": {
      get: {
        tags: ["Admin"],
        summary: "Заявки на подключение",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список заявок" } },
      },
    },
    "/api/admin/restaurant-applications": {
      get: {
        tags: ["Admin"],
        summary: "Заявки ресторанов",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Список заявок" } },
      },
    },
    "/api/admin/restaurant-applications/{applicationId}/approve": {
      post: {
        tags: ["Admin"],
        summary: "Одобрить заявку ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "applicationId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Заявка одобрена, аккаунт создан" } },
      },
    },
    "/api/admin/restaurant-applications/{applicationId}/reject": {
      post: {
        tags: ["Admin"],
        summary: "Отклонить заявку ресторана",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "applicationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
        responses: { "200": { description: "Заявка отклонена" } },
      },
    },
    "/api/admin/server-health": {
      get: {
        tags: ["Admin"],
        summary: "Состояние сервера",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Метрики сервера: CPU, RAM, диск, процессы, БД, логи" } },
      },
    },

    // ===== Verifications =====
    "/api/verifications/start": {
      post: {
        tags: ["Verifications"],
        summary: "Начать верификацию телефона",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["phone", "provider"], properties: { phone: { type: "string" }, provider: { type: "string", enum: ["max", "vk"] } } } } } },
        responses: { "200": { description: "Сессия верификации создана" } },
      },
    },
    "/api/verifications/{verificationSessionId}/status": {
      get: {
        tags: ["Verifications"],
        summary: "Статус верификации",
        parameters: [{ name: "verificationSessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Статус сессии" } },
      },
    },

    // ===== Webhooks =====
    "/api/webhooks/vk": {
      post: {
        tags: ["Webhooks"],
        summary: "Вебхук VK (Callback API)",
        responses: { "200": { description: "ok" } },
      },
    },
    "/api/webhooks/max": {
      post: {
        tags: ["Webhooks"],
        summary: "Вебхук MAX (бот)",
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

export async function GET() {
  // Same-origin only — the in-app API docs page fetches this without CORS.
  // A wildcard ACAO would let any site script-read the full API surface.
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
