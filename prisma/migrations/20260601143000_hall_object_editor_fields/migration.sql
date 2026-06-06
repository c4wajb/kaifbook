ALTER TABLE "hall_objects" ADD COLUMN "shape" TEXT NOT NULL DEFAULT 'rectangle';
ALTER TABLE "hall_objects" ADD COLUMN "icon" TEXT;
ALTER TABLE "hall_objects" ADD COLUMN "zIndex" INTEGER NOT NULL DEFAULT 0;
