-- Add visual seat selection metadata while keeping reservations table-based.
ALTER TABLE "reservations" ADD COLUMN "selectedSeatNumbers" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "reservation_settings" ADD COLUMN "allowSeatSelection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reservation_settings" ADD COLUMN "reserveWholeTableWhenSeatsSelected" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reservation_settings" ADD COLUMN "minSeatsSelection" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "reservation_settings" ADD COLUMN "maxSeatsSelection" INTEGER;
