-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('flat', 'per_day');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "pricingUnit" "PricingUnit" NOT NULL DEFAULT 'flat';
