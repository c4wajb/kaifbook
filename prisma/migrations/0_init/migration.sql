-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_login_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_staff_access" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'restaurant_staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_staff_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Курск',
    "address" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "comment" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReplyTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reviewText" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "generatedReply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReplyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "averageCheck" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "distanceText" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "badges" TEXT NOT NULL DEFAULT '[]',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "yandexOrgId" TEXT,
    "cuisineTypes" TEXT NOT NULL DEFAULT '[]',
    "features" TEXT NOT NULL DEFAULT '[]',
    "mainPhotoUrl" TEXT,
    "galleryPhotos" TEXT NOT NULL DEFAULT '[]',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "bannerTitle" TEXT,
    "bannerSubtitle" TEXT,
    "bannerImage" TEXT,
    "bannerSortOrder" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL DEFAULT 'free',
    "externalDepositAmount" INTEGER NOT NULL DEFAULT 0,
    "externalPaymentUrl" TEXT,
    "paymentTermsText" TEXT,
    "isPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showDepositInfo" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_reviews" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'demo',
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_working_hours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "restaurant_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "weight" TEXT,
    "photoUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halls" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "width" INTEGER NOT NULL DEFAULT 900,
    "height" INTEGER NOT NULL DEFAULT 520,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "halls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_objects" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 40,
    "y" INTEGER NOT NULL DEFAULT 40,
    "width" INTEGER NOT NULL DEFAULT 80,
    "height" INTEGER NOT NULL DEFAULT 48,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "shape" TEXT NOT NULL DEFAULT 'rectangle',
    "icon" TEXT,
    "color" TEXT,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hall_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableTypeId" TEXT,
    "number" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "bookingPrice" INTEGER,
    "depositAmount" INTEGER,
    "depositRequired" BOOLEAN,
    "minGuests" INTEGER,
    "maxGuests" INTEGER,
    "shape" TEXT NOT NULL DEFAULT 'rectangle',
    "x" INTEGER NOT NULL DEFAULT 40,
    "y" INTEGER NOT NULL DEFAULT 40,
    "width" INTEGER NOT NULL DEFAULT 96,
    "height" INTEGER NOT NULL DEFAULT 64,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT,
    "hallId" TEXT,
    "tableId" TEXT,
    "selectedSeatNumbers" TEXT NOT NULL DEFAULT '[]',
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "guestsCount" INTEGER NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "occasion" TEXT,
    "comment" TEXT,
    "internalComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'web',
    "cancellationReason" TEXT,
    "rejectionReason" TEXT,
    "noShowReason" TEXT,
    "confirmationToken" TEXT,
    "bookingPrice" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "isDepositRequired" BOOLEAN NOT NULL DEFAULT false,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" TEXT NOT NULL DEFAULT 'not_required',
    "paymentAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentUrl" TEXT,
    "paymentMarkedPaidByUserId" TEXT,
    "paymentMarkedPaidAt" TIMESTAMP(3),
    "paymentComment" TEXT,
    "verificationProvider" TEXT,
    "verificationStatus" TEXT,
    "verificationSessionId" TEXT,
    "verifiedExternalUserId" TEXT,
    "verifiedExternalChatId" TEXT,
    "verifiedExternalUsername" TEXT,
    "contactPhoneFromProvider" TEXT,
    "contactPhoneMatched" BOOLEAN,
    "confirmedByUserId" TEXT,
    "appliedPricingRuleId" TEXT,
    "pricingExplanation" TEXT,
    "noShowRiskScore" INTEGER NOT NULL DEFAULT 0,
    "noShowRiskLevel" TEXT NOT NULL DEFAULT 'low',
    "guestConfirmedAt" TIMESTAMP(3),
    "confirmationRequestedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "secondReminderSentAt" TIMESTAMP(3),
    "markedAtRiskAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_sessions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "phone" TEXT NOT NULL,
    "guestName" TEXT,
    "restaurantId" TEXT,
    "bookingDraftId" TEXT,
    "reservationId" TEXT,
    "token" TEXT NOT NULL,
    "publicCode" TEXT,
    "returnUrl" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "codeExpiresAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "vkState" TEXT,
    "vkCodeVerifierEncrypted" TEXT,
    "vkCodeChallenge" TEXT,
    "vkUserId" TEXT,
    "vkEmail" TEXT,
    "vkFirstName" TEXT,
    "vkLastName" TEXT,
    "vkRawUserJson" TEXT,
    "externalUserId" TEXT,
    "externalChatId" TEXT,
    "externalUsername" TEXT,
    "contactPhoneFromProvider" TEXT,
    "contactPhoneMatched" BOOLEAN,
    "messengerCodeHash" TEXT,
    "messengerCodeSentAt" TIMESTAMP(3),
    "messengerCodeConsumedAt" TIMESTAMP(3),
    "messengerCodeAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_audit_logs" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldPaymentStatus" TEXT,
    "newPaymentStatus" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthday" TIMESTAMP(3),
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "completedVisitsCount" INTEGER NOT NULL DEFAULT 0,
    "reservationsCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "noShowRate" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "lastReservationAt" TIMESTAMP(3),
    "lastVisitAt" TIMESTAMP(3),
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_types" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "minGuests" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL,
    "defaultDepositAmount" INTEGER NOT NULL DEFAULT 0,
    "defaultBookingPrice" INTEGER NOT NULL DEFAULT 0,
    "isDepositRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_pricing_rules" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tableTypeId" TEXT,
    "tableId" TEXT,
    "minGuests" INTEGER,
    "maxGuests" INTEGER,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "bookingPrice" INTEGER NOT NULL DEFAULT 0,
    "isDepositRequired" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_settings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "minGuests" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL DEFAULT 12,
    "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 120,
    "minAdvanceBookingMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "autoConfirmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowTableSelection" BOOLEAN NOT NULL DEFAULT true,
    "allowSeatSelection" BOOLEAN NOT NULL DEFAULT true,
    "reserveWholeTableWhenSeatsSelected" BOOLEAN NOT NULL DEFAULT true,
    "minSeatsSelection" INTEGER NOT NULL DEFAULT 1,
    "maxSeatsSelection" INTEGER,
    "requirePhoneConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "bookingIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "cancellationPolicyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_deposit_settings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
    "depositMode" TEXT NOT NULL DEFAULT 'disabled',
    "defaultDepositAmount" INTEGER NOT NULL DEFAULT 0,
    "requireDepositForLargeTables" BOOLEAN NOT NULL DEFAULT false,
    "requireDepositForGuestsFrom" INTEGER,
    "requireDepositForPeakHours" BOOLEAN NOT NULL DEFAULT false,
    "requireDepositForHighRiskGuests" BOOLEAN NOT NULL DEFAULT false,
    "paymentTimeoutMinutes" INTEGER NOT NULL DEFAULT 20,
    "depositRefundPolicyText" TEXT,
    "depositAccountingText" TEXT,
    "legalNoticeText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_deposit_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_show_settings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "secondReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "secondReminderMinutesBefore" INTEGER NOT NULL DEFAULT 120,
    "requireGuestConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "confirmationDeadlineMinutesBefore" INTEGER NOT NULL DEFAULT 120,
    "autoMarkAtRiskEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_show_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "guestId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" TEXT NOT NULL DEFAULT 'waiting_for_payment',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerPaymentId" TEXT,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestsCount" INTEGER NOT NULL,
    "desiredDate" TIMESTAMP(3) NOT NULL,
    "desiredStartTime" TEXT NOT NULL,
    "desiredEndTime" TEXT,
    "preferredTableTypeId" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_leads" (
    "id" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminComment" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdRestaurantId" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_page_events" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'site',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_page_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "restaurantId" TEXT,
    "reservationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "phone_login_codes_phone_createdAt_idx" ON "phone_login_codes"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "restaurant_staff_access_userId_idx" ON "restaurant_staff_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_staff_access_restaurantId_userId_key" ON "restaurant_staff_access"("restaurantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_userId_idx" ON "Business"("userId");

-- CreateIndex
CREATE INDEX "Business_slug_idx" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Customer_businessId_idx" ON "Customer"("businessId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Lead_businessId_idx" ON "Lead"("businessId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Promo_businessId_idx" ON "Promo"("businessId");

-- CreateIndex
CREATE INDEX "Promo_isActive_idx" ON "Promo"("isActive");

-- CreateIndex
CREATE INDEX "GeneratedContent_businessId_idx" ON "GeneratedContent"("businessId");

-- CreateIndex
CREATE INDEX "GeneratedContent_type_idx" ON "GeneratedContent"("type");

-- CreateIndex
CREATE INDEX "ReviewReplyTemplate_businessId_idx" ON "ReviewReplyTemplate"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "restaurants_ownerId_idx" ON "restaurants"("ownerId");

-- CreateIndex
CREATE INDEX "restaurants_city_idx" ON "restaurants"("city");

-- CreateIndex
CREATE INDEX "restaurants_status_isActive_idx" ON "restaurants"("status", "isActive");

-- CreateIndex
CREATE INDEX "restaurant_reviews_restaurantId_publishedAt_idx" ON "restaurant_reviews"("restaurantId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_working_hours_restaurantId_dayOfWeek_key" ON "restaurant_working_hours"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "menu_categories_restaurantId_sortOrder_idx" ON "menu_categories"("restaurantId", "sortOrder");

-- CreateIndex
CREATE INDEX "menu_items_restaurantId_categoryId_sortOrder_idx" ON "menu_items"("restaurantId", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "halls_restaurantId_sortOrder_idx" ON "halls"("restaurantId", "sortOrder");

-- CreateIndex
CREATE INDEX "hall_objects_restaurantId_idx" ON "hall_objects"("restaurantId");

-- CreateIndex
CREATE INDEX "hall_objects_hallId_idx" ON "hall_objects"("hallId");

-- CreateIndex
CREATE INDEX "restaurant_tables_hallId_idx" ON "restaurant_tables"("hallId");

-- CreateIndex
CREATE INDEX "restaurant_tables_restaurantId_idx" ON "restaurant_tables"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_tables_tableTypeId_idx" ON "restaurant_tables"("tableTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_confirmationToken_key" ON "reservations"("confirmationToken");

-- CreateIndex
CREATE INDEX "reservations_guestId_idx" ON "reservations"("guestId");

-- CreateIndex
CREATE INDEX "reservations_confirmationToken_idx" ON "reservations"("confirmationToken");

-- CreateIndex
CREATE INDEX "reservations_noShowRiskLevel_idx" ON "reservations"("noShowRiskLevel");

-- CreateIndex
CREATE INDEX "reservations_paymentStatus_idx" ON "reservations"("paymentStatus");

-- CreateIndex
CREATE INDEX "reservations_verificationProvider_idx" ON "reservations"("verificationProvider");

-- CreateIndex
CREATE INDEX "reservations_verificationStatus_idx" ON "reservations"("verificationStatus");

-- CreateIndex
CREATE INDEX "reservations_verificationSessionId_idx" ON "reservations"("verificationSessionId");

-- CreateIndex
CREATE INDEX "reservations_restaurantId_reservationDate_status_idx" ON "reservations"("restaurantId", "reservationDate", "status");

-- CreateIndex
CREATE INDEX "reservations_tableId_reservationDate_status_idx" ON "reservations"("tableId", "reservationDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "verification_sessions_token_key" ON "verification_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_sessions_publicCode_key" ON "verification_sessions"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "verification_sessions_vkState_key" ON "verification_sessions"("vkState");

-- CreateIndex
CREATE INDEX "verification_sessions_provider_status_idx" ON "verification_sessions"("provider", "status");

-- CreateIndex
CREATE INDEX "verification_sessions_method_status_idx" ON "verification_sessions"("method", "status");

-- CreateIndex
CREATE INDEX "verification_sessions_phone_createdAt_idx" ON "verification_sessions"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "verification_sessions_ipAddress_createdAt_idx" ON "verification_sessions"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "verification_sessions_restaurantId_idx" ON "verification_sessions"("restaurantId");

-- CreateIndex
CREATE INDEX "verification_sessions_reservationId_idx" ON "verification_sessions"("reservationId");

-- CreateIndex
CREATE INDEX "verification_sessions_expiresAt_idx" ON "verification_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "verification_sessions_codeExpiresAt_idx" ON "verification_sessions"("codeExpiresAt");

-- CreateIndex
CREATE INDEX "reservation_audit_logs_reservationId_createdAt_idx" ON "reservation_audit_logs"("reservationId", "createdAt");

-- CreateIndex
CREATE INDEX "reservation_audit_logs_restaurantId_createdAt_idx" ON "reservation_audit_logs"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "reservation_audit_logs_actorUserId_idx" ON "reservation_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "guests_restaurantId_name_idx" ON "guests"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "guests_restaurantId_updatedAt_idx" ON "guests"("restaurantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "guests_restaurantId_phone_key" ON "guests"("restaurantId", "phone");

-- CreateIndex
CREATE INDEX "table_types_restaurantId_isActive_idx" ON "table_types"("restaurantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "table_types_restaurantId_code_key" ON "table_types"("restaurantId", "code");

-- CreateIndex
CREATE INDEX "booking_pricing_rules_restaurantId_isActive_priority_idx" ON "booking_pricing_rules"("restaurantId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "booking_pricing_rules_tableTypeId_idx" ON "booking_pricing_rules"("tableTypeId");

-- CreateIndex
CREATE INDEX "booking_pricing_rules_tableId_idx" ON "booking_pricing_rules"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_settings_restaurantId_key" ON "reservation_settings"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_deposit_settings_restaurantId_key" ON "reservation_deposit_settings"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "no_show_settings_restaurantId_key" ON "no_show_settings"("restaurantId");

-- CreateIndex
CREATE INDEX "payments_restaurantId_status_idx" ON "payments"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "payments_reservationId_idx" ON "payments"("reservationId");

-- CreateIndex
CREATE INDEX "payments_guestId_idx" ON "payments"("guestId");

-- CreateIndex
CREATE INDEX "waitlist_entries_restaurantId_status_idx" ON "waitlist_entries"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_preferredTableTypeId_idx" ON "waitlist_entries"("preferredTableTypeId");

-- CreateIndex
CREATE INDEX "recommendations_restaurantId_isRead_priority_idx" ON "recommendations"("restaurantId", "isRead", "priority");

-- CreateIndex
CREATE INDEX "restaurant_leads_status_idx" ON "restaurant_leads"("status");

-- CreateIndex
CREATE INDEX "restaurant_leads_createdAt_idx" ON "restaurant_leads"("createdAt");

-- CreateIndex
CREATE INDEX "restaurant_page_events_restaurantId_type_createdAt_idx" ON "restaurant_page_events"("restaurantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_restaurantId_idx" ON "notifications"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurant_staff_access" ADD CONSTRAINT "restaurant_staff_access_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_staff_access" ADD CONSTRAINT "restaurant_staff_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promo" ADD CONSTRAINT "Promo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReplyTemplate" ADD CONSTRAINT "ReviewReplyTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_working_hours" ADD CONSTRAINT "restaurant_working_hours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "menu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halls" ADD CONSTRAINT "halls_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_objects" ADD CONSTRAINT "hall_objects_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_objects" ADD CONSTRAINT "hall_objects_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_tableTypeId_fkey" FOREIGN KEY ("tableTypeId") REFERENCES "table_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_sessions" ADD CONSTRAINT "verification_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_audit_logs" ADD CONSTRAINT "reservation_audit_logs_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_audit_logs" ADD CONSTRAINT "reservation_audit_logs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_audit_logs" ADD CONSTRAINT "reservation_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_types" ADD CONSTRAINT "table_types_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_pricing_rules" ADD CONSTRAINT "booking_pricing_rules_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_pricing_rules" ADD CONSTRAINT "booking_pricing_rules_tableTypeId_fkey" FOREIGN KEY ("tableTypeId") REFERENCES "table_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_pricing_rules" ADD CONSTRAINT "booking_pricing_rules_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_settings" ADD CONSTRAINT "reservation_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_deposit_settings" ADD CONSTRAINT "reservation_deposit_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_show_settings" ADD CONSTRAINT "no_show_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_preferredTableTypeId_fkey" FOREIGN KEY ("preferredTableTypeId") REFERENCES "table_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_page_events" ADD CONSTRAINT "restaurant_page_events_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

