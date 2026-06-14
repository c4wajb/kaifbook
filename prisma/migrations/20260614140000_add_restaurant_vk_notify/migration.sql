-- Restaurant can link a VK account to receive new-booking notifications.
ALTER TABLE "restaurants" ADD COLUMN "vkNotifyPeerId" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "vkNotifyName" TEXT;
