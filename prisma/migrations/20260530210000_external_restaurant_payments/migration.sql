ALTER TABLE "restaurants" ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "restaurants" ADD COLUMN "externalDepositAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN "externalPaymentUrl" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "paymentTermsText" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "isPaymentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN "showDepositInfo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "reservations" ADD COLUMN "paymentRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reservations" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "reservations" ADD COLUMN "paymentAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reservations" ADD COLUMN "paymentUrl" TEXT;
ALTER TABLE "reservations" ADD COLUMN "paymentMarkedPaidByUserId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "paymentMarkedPaidAt" DATETIME;
ALTER TABLE "reservations" ADD COLUMN "paymentComment" TEXT;
ALTER TABLE "reservations" ADD COLUMN "confirmedByUserId" TEXT;

ALTER TABLE "reservation_audit_logs" ADD COLUMN "oldPaymentStatus" TEXT;
ALTER TABLE "reservation_audit_logs" ADD COLUMN "newPaymentStatus" TEXT;

CREATE INDEX "reservations_paymentStatus_idx" ON "reservations"("paymentStatus");
