-- Extend restaurant reservation MVP into a restaurant SaaS layer.
ALTER TABLE "restaurants" ADD COLUMN "website" TEXT;

ALTER TABLE "reservations" ADD COLUMN "guestId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "occasion" TEXT;
ALTER TABLE "reservations" ADD COLUMN "internalComment" TEXT;
ALTER TABLE "reservations" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "reservations" ADD COLUMN "noShowReason" TEXT;
ALTER TABLE "reservations" ADD COLUMN "confirmedAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "completedAt" DATETIME;

CREATE TABLE "guests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "birthday" DATETIME,
  "visitsCount" INTEGER NOT NULL DEFAULT 0,
  "reservationsCount" INTEGER NOT NULL DEFAULT 0,
  "noShowCount" INTEGER NOT NULL DEFAULT 0,
  "cancelledCount" INTEGER NOT NULL DEFAULT 0,
  "lastVisitAt" DATETIME,
  "totalGuests" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guests_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "reservation_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "minGuests" INTEGER NOT NULL DEFAULT 1,
  "maxGuests" INTEGER NOT NULL DEFAULT 12,
  "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 120,
  "minAdvanceBookingMinutes" INTEGER NOT NULL DEFAULT 60,
  "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
  "autoConfirmEnabled" BOOLEAN NOT NULL DEFAULT false,
  "allowTableSelection" BOOLEAN NOT NULL DEFAULT true,
  "requirePhoneConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "bookingIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
  "cancellationPolicyText" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recommendations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 2,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recommendations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "restaurant_leads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "restaurant_page_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'site',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_page_events_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guests_restaurantId_phone_key" ON "guests"("restaurantId", "phone");
CREATE INDEX "guests_restaurantId_name_idx" ON "guests"("restaurantId", "name");
CREATE INDEX "guests_restaurantId_updatedAt_idx" ON "guests"("restaurantId", "updatedAt");
CREATE UNIQUE INDEX "reservation_settings_restaurantId_key" ON "reservation_settings"("restaurantId");
CREATE INDEX "recommendations_restaurantId_isRead_priority_idx" ON "recommendations"("restaurantId", "isRead", "priority");
CREATE INDEX "restaurant_leads_status_idx" ON "restaurant_leads"("status");
CREATE INDEX "restaurant_leads_createdAt_idx" ON "restaurant_leads"("createdAt");
CREATE INDEX "restaurant_page_events_restaurantId_type_createdAt_idx" ON "restaurant_page_events"("restaurantId", "type", "createdAt");
CREATE INDEX "reservations_guestId_idx" ON "reservations"("guestId");
