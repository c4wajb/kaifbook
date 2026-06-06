-- Add public catalog enrichment fields without changing existing booking data.
ALTER TABLE "restaurants" ADD COLUMN "rating" REAL NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN "reviewsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN "distanceText" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "restaurants" ADD COLUMN "badges" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "restaurants" ADD COLUMN "latitude" REAL;
ALTER TABLE "restaurants" ADD COLUMN "longitude" REAL;

CREATE TABLE "restaurant_reviews" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'demo',
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_reviews_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "restaurant_reviews_restaurantId_publishedAt_idx" ON "restaurant_reviews"("restaurantId", "publishedAt");
