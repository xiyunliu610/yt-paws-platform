-- Money fields as Decimal instead of Float, to avoid floating-point
-- precision issues on charges.
ALTER TABLE "Service" ALTER COLUMN "price" TYPE DECIMAL(10,2) USING "price"::numeric(10,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::numeric(10,2);

-- Booking.unitPrice/pricingUnit: snapshot of the Service's price at booking
-- time, so a later price change doesn't alter what an existing (unpaid)
-- booking owes. Added nullable, backfilled from the linked Service for
-- existing rows, then made required.
ALTER TABLE "Booking" ADD COLUMN "unitPrice" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "pricingUnit" "PricingUnit";

UPDATE "Booking" b
SET "unitPrice" = s."price",
    "pricingUnit" = s."pricingUnit"
FROM "Service" s
WHERE b."serviceId" = s."id";

ALTER TABLE "Booking" ALTER COLUMN "unitPrice" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "pricingUnit" SET NOT NULL;
