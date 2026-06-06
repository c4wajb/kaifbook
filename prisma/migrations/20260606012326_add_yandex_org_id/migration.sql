-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "yandexOrgId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_booking_pricing_rules" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "booking_pricing_rules_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "booking_pricing_rules_tableTypeId_fkey" FOREIGN KEY ("tableTypeId") REFERENCES "table_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "booking_pricing_rules_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_booking_pricing_rules" ("bookingPrice", "createdAt", "dayOfWeek", "depositAmount", "endTime", "id", "isActive", "isDepositRequired", "maxGuests", "minGuests", "priority", "restaurantId", "startTime", "tableId", "tableTypeId", "title", "updatedAt") SELECT "bookingPrice", "createdAt", "dayOfWeek", "depositAmount", "endTime", "id", "isActive", "isDepositRequired", "maxGuests", "minGuests", "priority", "restaurantId", "startTime", "tableId", "tableTypeId", "title", "updatedAt" FROM "booking_pricing_rules";
DROP TABLE "booking_pricing_rules";
ALTER TABLE "new_booking_pricing_rules" RENAME TO "booking_pricing_rules";
CREATE INDEX "booking_pricing_rules_restaurantId_isActive_priority_idx" ON "booking_pricing_rules"("restaurantId", "isActive", "priority");
CREATE INDEX "booking_pricing_rules_tableTypeId_idx" ON "booking_pricing_rules"("tableTypeId");
CREATE INDEX "booking_pricing_rules_tableId_idx" ON "booking_pricing_rules"("tableId");
CREATE TABLE "new_guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthday" DATETIME,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "completedVisitsCount" INTEGER NOT NULL DEFAULT 0,
    "reservationsCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "noShowRate" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "lastReservationAt" DATETIME,
    "lastVisitAt" DATETIME,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guests_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_guests" ("birthday", "cancelledCount", "completedVisitsCount", "createdAt", "email", "id", "lastReservationAt", "lastVisitAt", "name", "noShowCount", "noShowRate", "notes", "phone", "reservationsCount", "restaurantId", "riskLevel", "tags", "totalGuests", "updatedAt", "visitsCount") SELECT "birthday", "cancelledCount", "completedVisitsCount", "createdAt", "email", "id", "lastReservationAt", "lastVisitAt", "name", "noShowCount", "noShowRate", "notes", "phone", "reservationsCount", "restaurantId", "riskLevel", "tags", "totalGuests", "updatedAt", "visitsCount" FROM "guests";
DROP TABLE "guests";
ALTER TABLE "new_guests" RENAME TO "guests";
CREATE INDEX "guests_restaurantId_name_idx" ON "guests"("restaurantId", "name");
CREATE INDEX "guests_restaurantId_updatedAt_idx" ON "guests"("restaurantId", "updatedAt");
CREATE UNIQUE INDEX "guests_restaurantId_phone_key" ON "guests"("restaurantId", "phone");
CREATE TABLE "new_no_show_settings" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "no_show_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_no_show_settings" ("autoMarkAtRiskEnabled", "confirmationDeadlineMinutesBefore", "createdAt", "id", "reminderEnabled", "reminderHoursBefore", "requireGuestConfirmation", "restaurantId", "secondReminderEnabled", "secondReminderMinutesBefore", "updatedAt") SELECT "autoMarkAtRiskEnabled", "confirmationDeadlineMinutesBefore", "createdAt", "id", "reminderEnabled", "reminderHoursBefore", "requireGuestConfirmation", "restaurantId", "secondReminderEnabled", "secondReminderMinutesBefore", "updatedAt" FROM "no_show_settings";
DROP TABLE "no_show_settings";
ALTER TABLE "new_no_show_settings" RENAME TO "no_show_settings";
CREATE UNIQUE INDEX "no_show_settings_restaurantId_key" ON "no_show_settings"("restaurantId");
CREATE TABLE "new_payments" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "createdAt", "currency", "guestId", "id", "paidAt", "paymentUrl", "provider", "providerPaymentId", "refundedAt", "reservationId", "restaurantId", "status", "updatedAt") SELECT "amount", "createdAt", "currency", "guestId", "id", "paidAt", "paymentUrl", "provider", "providerPaymentId", "refundedAt", "reservationId", "restaurantId", "status", "updatedAt" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_restaurantId_status_idx" ON "payments"("restaurantId", "status");
CREATE INDEX "payments_reservationId_idx" ON "payments"("reservationId");
CREATE INDEX "payments_guestId_idx" ON "payments"("guestId");
CREATE TABLE "new_reservation_deposit_settings" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reservation_deposit_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reservation_deposit_settings" ("createdAt", "defaultDepositAmount", "depositAccountingText", "depositEnabled", "depositMode", "depositRefundPolicyText", "id", "isActive", "legalNoticeText", "paymentTimeoutMinutes", "requireDepositForGuestsFrom", "requireDepositForHighRiskGuests", "requireDepositForLargeTables", "requireDepositForPeakHours", "restaurantId", "updatedAt") SELECT "createdAt", "defaultDepositAmount", "depositAccountingText", "depositEnabled", "depositMode", "depositRefundPolicyText", "id", "isActive", "legalNoticeText", "paymentTimeoutMinutes", "requireDepositForGuestsFrom", "requireDepositForHighRiskGuests", "requireDepositForLargeTables", "requireDepositForPeakHours", "restaurantId", "updatedAt" FROM "reservation_deposit_settings";
DROP TABLE "reservation_deposit_settings";
ALTER TABLE "new_reservation_deposit_settings" RENAME TO "reservation_deposit_settings";
CREATE UNIQUE INDEX "reservation_deposit_settings_restaurantId_key" ON "reservation_deposit_settings"("restaurantId");
CREATE TABLE "new_reservation_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reservation_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reservation_settings" ("allowSeatSelection", "allowTableSelection", "autoConfirmEnabled", "bookingIntervalMinutes", "cancellationPolicyText", "createdAt", "id", "maxAdvanceBookingDays", "maxGuests", "maxSeatsSelection", "minAdvanceBookingMinutes", "minGuests", "minSeatsSelection", "requirePhoneConfirmation", "reservationDurationMinutes", "reserveWholeTableWhenSeatsSelected", "restaurantId", "updatedAt") SELECT "allowSeatSelection", "allowTableSelection", "autoConfirmEnabled", "bookingIntervalMinutes", "cancellationPolicyText", "createdAt", "id", "maxAdvanceBookingDays", "maxGuests", "maxSeatsSelection", "minAdvanceBookingMinutes", "minGuests", "minSeatsSelection", "requirePhoneConfirmation", "reservationDurationMinutes", "reserveWholeTableWhenSeatsSelected", "restaurantId", "updatedAt" FROM "reservation_settings";
DROP TABLE "reservation_settings";
ALTER TABLE "new_reservation_settings" RENAME TO "reservation_settings";
CREATE UNIQUE INDEX "reservation_settings_restaurantId_key" ON "reservation_settings"("restaurantId");
CREATE TABLE "new_reservations" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "reservationDate" DATETIME NOT NULL,
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
    "paymentMarkedPaidAt" DATETIME,
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
    "guestConfirmedAt" DATETIME,
    "confirmationRequestedAt" DATETIME,
    "reminderSentAt" DATETIME,
    "secondReminderSentAt" DATETIME,
    "markedAtRiskAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reservations_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reservations_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_reservations" ("appliedPricingRuleId", "bookingPrice", "cancellationReason", "cancelledAt", "comment", "completedAt", "confirmationRequestedAt", "confirmationToken", "confirmedAt", "confirmedByUserId", "contactPhoneFromProvider", "contactPhoneMatched", "createdAt", "customerEmail", "customerName", "customerPhone", "depositAmount", "endTime", "guestConfirmedAt", "guestId", "guestsCount", "hallId", "id", "internalComment", "isDepositRequired", "markedAtRiskAt", "noShowReason", "noShowRiskLevel", "noShowRiskScore", "occasion", "paymentAmount", "paymentComment", "paymentMarkedPaidAt", "paymentMarkedPaidByUserId", "paymentRequired", "paymentStatus", "paymentUrl", "pricingExplanation", "rejectionReason", "reminderSentAt", "reservationDate", "restaurantId", "secondReminderSentAt", "selectedSeatNumbers", "source", "startTime", "status", "tableId", "updatedAt", "userId", "verificationProvider", "verificationSessionId", "verificationStatus", "verifiedExternalChatId", "verifiedExternalUserId", "verifiedExternalUsername") SELECT "appliedPricingRuleId", "bookingPrice", "cancellationReason", "cancelledAt", "comment", "completedAt", "confirmationRequestedAt", "confirmationToken", "confirmedAt", "confirmedByUserId", "contactPhoneFromProvider", "contactPhoneMatched", "createdAt", "customerEmail", "customerName", "customerPhone", "depositAmount", "endTime", "guestConfirmedAt", "guestId", "guestsCount", "hallId", "id", "internalComment", "isDepositRequired", "markedAtRiskAt", "noShowReason", "noShowRiskLevel", "noShowRiskScore", "occasion", "paymentAmount", "paymentComment", "paymentMarkedPaidAt", "paymentMarkedPaidByUserId", "paymentRequired", "paymentStatus", "paymentUrl", "pricingExplanation", "rejectionReason", "reminderSentAt", "reservationDate", "restaurantId", "secondReminderSentAt", "selectedSeatNumbers", "source", "startTime", "status", "tableId", "updatedAt", "userId", "verificationProvider", "verificationSessionId", "verificationStatus", "verifiedExternalChatId", "verifiedExternalUserId", "verifiedExternalUsername" FROM "reservations";
DROP TABLE "reservations";
ALTER TABLE "new_reservations" RENAME TO "reservations";
CREATE UNIQUE INDEX "reservations_confirmationToken_key" ON "reservations"("confirmationToken");
CREATE INDEX "reservations_guestId_idx" ON "reservations"("guestId");
CREATE INDEX "reservations_confirmationToken_idx" ON "reservations"("confirmationToken");
CREATE INDEX "reservations_noShowRiskLevel_idx" ON "reservations"("noShowRiskLevel");
CREATE INDEX "reservations_paymentStatus_idx" ON "reservations"("paymentStatus");
CREATE INDEX "reservations_verificationProvider_idx" ON "reservations"("verificationProvider");
CREATE INDEX "reservations_verificationStatus_idx" ON "reservations"("verificationStatus");
CREATE INDEX "reservations_verificationSessionId_idx" ON "reservations"("verificationSessionId");
CREATE INDEX "reservations_restaurantId_reservationDate_status_idx" ON "reservations"("restaurantId", "reservationDate", "status");
CREATE INDEX "reservations_tableId_reservationDate_status_idx" ON "reservations"("tableId", "reservationDate", "status");
CREATE TABLE "new_restaurant_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminComment" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdRestaurantId" TEXT,
    "createdUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_restaurant_leads" ("address", "adminComment", "approvedAt", "city", "comment", "contactName", "createdAt", "createdRestaurantId", "createdUserId", "email", "id", "phone", "rejectedAt", "restaurantName", "status", "updatedAt") SELECT "address", "adminComment", "approvedAt", "city", "comment", "contactName", "createdAt", "createdRestaurantId", "createdUserId", "email", "id", "phone", "rejectedAt", "restaurantName", "status", "updatedAt" FROM "restaurant_leads";
DROP TABLE "restaurant_leads";
ALTER TABLE "new_restaurant_leads" RENAME TO "restaurant_leads";
CREATE INDEX "restaurant_leads_status_idx" ON "restaurant_leads"("status");
CREATE INDEX "restaurant_leads_createdAt_idx" ON "restaurant_leads"("createdAt");
CREATE TABLE "new_restaurant_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "restaurant_tables_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "restaurant_tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "restaurant_tables_tableTypeId_fkey" FOREIGN KEY ("tableTypeId") REFERENCES "table_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_restaurant_tables" ("bookingPrice", "createdAt", "depositAmount", "depositRequired", "hallId", "height", "id", "isActive", "maxGuests", "minGuests", "number", "restaurantId", "rotation", "seats", "shape", "tableTypeId", "updatedAt", "width", "x", "y") SELECT "bookingPrice", "createdAt", "depositAmount", "depositRequired", "hallId", "height", "id", "isActive", "maxGuests", "minGuests", "number", "restaurantId", "rotation", "seats", "shape", "tableTypeId", "updatedAt", "width", "x", "y" FROM "restaurant_tables";
DROP TABLE "restaurant_tables";
ALTER TABLE "new_restaurant_tables" RENAME TO "restaurant_tables";
CREATE INDEX "restaurant_tables_hallId_idx" ON "restaurant_tables"("hallId");
CREATE INDEX "restaurant_tables_restaurantId_idx" ON "restaurant_tables"("restaurantId");
CREATE INDEX "restaurant_tables_tableTypeId_idx" ON "restaurant_tables"("tableTypeId");
CREATE TABLE "new_table_types" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "table_types_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_table_types" ("code", "createdAt", "defaultBookingPrice", "defaultDepositAmount", "description", "id", "isActive", "isDepositRequired", "maxGuests", "minGuests", "restaurantId", "title", "updatedAt") SELECT "code", "createdAt", "defaultBookingPrice", "defaultDepositAmount", "description", "id", "isActive", "isDepositRequired", "maxGuests", "minGuests", "restaurantId", "title", "updatedAt" FROM "table_types";
DROP TABLE "table_types";
ALTER TABLE "new_table_types" RENAME TO "table_types";
CREATE INDEX "table_types_restaurantId_isActive_idx" ON "table_types"("restaurantId", "isActive");
CREATE UNIQUE INDEX "table_types_restaurantId_code_key" ON "table_types"("restaurantId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
