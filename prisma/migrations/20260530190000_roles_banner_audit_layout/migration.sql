ALTER TABLE "restaurants" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN "bannerTitle" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "bannerSubtitle" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "bannerImage" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "bannerSortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "halls" ADD COLUMN "description" TEXT;

CREATE TABLE "restaurant_staff_access" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'restaurant_staff',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "restaurant_staff_access_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "restaurant_staff_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "restaurant_staff_access_restaurantId_userId_key" ON "restaurant_staff_access"("restaurantId", "userId");
CREATE INDEX "restaurant_staff_access_userId_idx" ON "restaurant_staff_access"("userId");

CREATE TABLE "reservation_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "oldStatus" TEXT,
  "newStatus" TEXT,
  "comment" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_audit_logs_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reservation_audit_logs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reservation_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "reservation_audit_logs_reservationId_createdAt_idx" ON "reservation_audit_logs"("reservationId", "createdAt");
CREATE INDEX "reservation_audit_logs_restaurantId_createdAt_idx" ON "reservation_audit_logs"("restaurantId", "createdAt");
CREATE INDEX "reservation_audit_logs_actorUserId_idx" ON "reservation_audit_logs"("actorUserId");

CREATE TABLE "hall_objects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "hallId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "x" INTEGER NOT NULL DEFAULT 40,
  "y" INTEGER NOT NULL DEFAULT 40,
  "width" INTEGER NOT NULL DEFAULT 80,
  "height" INTEGER NOT NULL DEFAULT 48,
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "color" TEXT,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "hall_objects_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hall_objects_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "hall_objects_restaurantId_idx" ON "hall_objects"("restaurantId");
CREATE INDEX "hall_objects_hallId_idx" ON "hall_objects"("hallId");
