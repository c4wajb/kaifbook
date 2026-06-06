-- No-show protection, table types, deposit pricing and mock payments.

ALTER TABLE "restaurant_tables" ADD COLUMN "tableTypeId" TEXT;
ALTER TABLE "restaurant_tables" ADD COLUMN "bookingPrice" INTEGER;
ALTER TABLE "restaurant_tables" ADD COLUMN "depositAmount" INTEGER;
ALTER TABLE "restaurant_tables" ADD COLUMN "depositRequired" BOOLEAN;
ALTER TABLE "restaurant_tables" ADD COLUMN "minGuests" INTEGER;
ALTER TABLE "restaurant_tables" ADD COLUMN "maxGuests" INTEGER;

ALTER TABLE "reservations" ADD COLUMN "confirmationToken" TEXT;
ALTER TABLE "reservations" ADD COLUMN "bookingPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reservations" ADD COLUMN "depositAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reservations" ADD COLUMN "isDepositRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reservations" ADD COLUMN "appliedPricingRuleId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "pricingExplanation" TEXT;
ALTER TABLE "reservations" ADD COLUMN "noShowRiskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reservations" ADD COLUMN "noShowRiskLevel" TEXT NOT NULL DEFAULT 'low';
ALTER TABLE "reservations" ADD COLUMN "guestConfirmedAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "confirmationRequestedAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "reminderSentAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "secondReminderSentAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "markedAtRiskAt" DATETIME;

ALTER TABLE "guests" ADD COLUMN "completedVisitsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guests" ADD COLUMN "noShowRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guests" ADD COLUMN "lastReservationAt" DATETIME;
ALTER TABLE "guests" ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'low';

CREATE TABLE "table_types" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "table_types_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "booking_pricing_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_pricing_rules_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booking_pricing_rules_tableTypeId_fkey" FOREIGN KEY ("tableTypeId") REFERENCES "table_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "booking_pricing_rules_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "reservation_deposit_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_deposit_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "no_show_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
  "secondReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "secondReminderMinutesBefore" INTEGER NOT NULL DEFAULT 120,
  "requireGuestConfirmation" BOOLEAN NOT NULL DEFAULT true,
  "confirmationDeadlineMinutesBefore" INTEGER NOT NULL DEFAULT 120,
  "autoMarkAtRiskEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "no_show_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "guestId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "status" TEXT NOT NULL DEFAULT 'waiting_for_payment',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "providerPaymentId" TEXT,
  "paymentUrl" TEXT,
  "paidAt" DATETIME,
  "refundedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "waitlist_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "guestPhone" TEXT NOT NULL,
  "guestsCount" INTEGER NOT NULL,
  "desiredDate" DATETIME NOT NULL,
  "desiredStartTime" TEXT NOT NULL,
  "desiredEndTime" TEXT,
  "preferredTableTypeId" TEXT,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" DATETIME,
  CONSTRAINT "waitlist_entries_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "waitlist_entries_preferredTableTypeId_fkey" FOREIGN KEY ("preferredTableTypeId") REFERENCES "table_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "table_types_restaurantId_code_key" ON "table_types"("restaurantId", "code");
CREATE INDEX "table_types_restaurantId_isActive_idx" ON "table_types"("restaurantId", "isActive");
CREATE INDEX "restaurant_tables_tableTypeId_idx" ON "restaurant_tables"("tableTypeId");
CREATE INDEX "booking_pricing_rules_restaurantId_isActive_priority_idx" ON "booking_pricing_rules"("restaurantId", "isActive", "priority");
CREATE INDEX "booking_pricing_rules_tableTypeId_idx" ON "booking_pricing_rules"("tableTypeId");
CREATE INDEX "booking_pricing_rules_tableId_idx" ON "booking_pricing_rules"("tableId");
CREATE UNIQUE INDEX "reservation_deposit_settings_restaurantId_key" ON "reservation_deposit_settings"("restaurantId");
CREATE UNIQUE INDEX "no_show_settings_restaurantId_key" ON "no_show_settings"("restaurantId");
CREATE INDEX "payments_restaurantId_status_idx" ON "payments"("restaurantId", "status");
CREATE INDEX "payments_reservationId_idx" ON "payments"("reservationId");
CREATE INDEX "payments_guestId_idx" ON "payments"("guestId");
CREATE UNIQUE INDEX "reservations_confirmationToken_key" ON "reservations"("confirmationToken");
CREATE INDEX "reservations_confirmationToken_idx" ON "reservations"("confirmationToken");
CREATE INDEX "reservations_noShowRiskLevel_idx" ON "reservations"("noShowRiskLevel");
CREATE INDEX "waitlist_entries_restaurantId_status_idx" ON "waitlist_entries"("restaurantId", "status");
CREATE INDEX "waitlist_entries_preferredTableTypeId_idx" ON "waitlist_entries"("preferredTableTypeId");
