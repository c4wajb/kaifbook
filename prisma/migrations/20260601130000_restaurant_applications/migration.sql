ALTER TABLE "restaurant_leads" ADD COLUMN "email" TEXT;
ALTER TABLE "restaurant_leads" ADD COLUMN "address" TEXT;
ALTER TABLE "restaurant_leads" ADD COLUMN "adminComment" TEXT;
ALTER TABLE "restaurant_leads" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "restaurant_leads" ADD COLUMN "rejectedAt" DATETIME;
ALTER TABLE "restaurant_leads" ADD COLUMN "createdRestaurantId" TEXT;
ALTER TABLE "restaurant_leads" ADD COLUMN "createdUserId" TEXT;
