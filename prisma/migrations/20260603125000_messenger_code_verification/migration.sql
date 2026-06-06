ALTER TABLE "verification_sessions" ADD COLUMN "messengerCodeHash" TEXT;
ALTER TABLE "verification_sessions" ADD COLUMN "messengerCodeSentAt" DATETIME;
ALTER TABLE "verification_sessions" ADD COLUMN "messengerCodeConsumedAt" DATETIME;
ALTER TABLE "verification_sessions" ADD COLUMN "messengerCodeAttempts" INTEGER NOT NULL DEFAULT 0;
