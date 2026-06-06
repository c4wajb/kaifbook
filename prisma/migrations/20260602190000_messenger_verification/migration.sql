-- Add optional MAX/VK reservation confirmation sessions.
CREATE TABLE "verification_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "phone" TEXT NOT NULL,
  "guestName" TEXT,
  "restaurantId" TEXT,
  "bookingDraftId" TEXT,
  "reservationId" TEXT,
  "token" TEXT NOT NULL,
  "ipAddress" TEXT,
  "expiresAt" DATETIME NOT NULL,
  "externalUserId" TEXT,
  "externalChatId" TEXT,
  "externalUsername" TEXT,
  "contactPhoneFromProvider" TEXT,
  "contactPhoneMatched" BOOLEAN,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "confirmedAt" DATETIME,
  CONSTRAINT "verification_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "verification_sessions_token_key" ON "verification_sessions"("token");
CREATE INDEX "verification_sessions_provider_status_idx" ON "verification_sessions"("provider", "status");
CREATE INDEX "verification_sessions_phone_createdAt_idx" ON "verification_sessions"("phone", "createdAt");
CREATE INDEX "verification_sessions_ipAddress_createdAt_idx" ON "verification_sessions"("ipAddress", "createdAt");
CREATE INDEX "verification_sessions_restaurantId_idx" ON "verification_sessions"("restaurantId");
CREATE INDEX "verification_sessions_reservationId_idx" ON "verification_sessions"("reservationId");
CREATE INDEX "verification_sessions_expiresAt_idx" ON "verification_sessions"("expiresAt");

ALTER TABLE "reservations" ADD COLUMN "verificationProvider" TEXT;
ALTER TABLE "reservations" ADD COLUMN "verificationStatus" TEXT;
ALTER TABLE "reservations" ADD COLUMN "verificationSessionId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "verifiedExternalUserId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "verifiedExternalChatId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "verifiedExternalUsername" TEXT;
ALTER TABLE "reservations" ADD COLUMN "contactPhoneFromProvider" TEXT;
ALTER TABLE "reservations" ADD COLUMN "contactPhoneMatched" BOOLEAN;

CREATE INDEX "reservations_verificationProvider_idx" ON "reservations"("verificationProvider");
CREATE INDEX "reservations_verificationStatus_idx" ON "reservations"("verificationStatus");
CREATE INDEX "reservations_verificationSessionId_idx" ON "reservations"("verificationSessionId");
