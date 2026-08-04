ALTER TABLE "Business" ADD COLUMN "maxConcurrentBookings" INTEGER;
ALTER TABLE "Service" ADD COLUMN "maxConcurrentBookings" INTEGER;
ALTER TABLE "User" ADD COLUMN "maxConcurrentBookings" INTEGER;
ALTER TABLE "Business" ADD CONSTRAINT "Business_maxConcurrentBookings_check" CHECK ("maxConcurrentBookings" IS NULL OR "maxConcurrentBookings" > 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_maxConcurrentBookings_check" CHECK ("maxConcurrentBookings" IS NULL OR "maxConcurrentBookings" > 0);
ALTER TABLE "User" ADD CONSTRAINT "User_maxConcurrentBookings_check" CHECK ("maxConcurrentBookings" IS NULL OR "maxConcurrentBookings" > 0);
