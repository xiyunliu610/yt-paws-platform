-- User.isActive: lets JwtStrategy reject a disabled/removed account
-- immediately rather than waiting out the token's expiry.
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- StripeCheckoutAttempt: one row per Checkout Session ever created for a
-- Payment. Replaces Payment.providerRef, which a retry used to overwrite —
-- losing the ability to resolve a webhook for an older, still-payable
-- session back to its Payment. No existing "stripe" Payment rows have a
-- providerRef set (checked before writing this migration), so there is
-- nothing to backfill.
CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('pending', 'succeeded', 'expired');

CREATE TABLE "StripeCheckoutAttempt" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeCheckoutAttempt_sessionId_key" ON "StripeCheckoutAttempt"("sessionId");

ALTER TABLE "StripeCheckoutAttempt" ADD CONSTRAINT "StripeCheckoutAttempt_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" DROP COLUMN "providerRef";

-- At most one "active" Payment per booking per method, enforced by the
-- database rather than only by application-level check-then-create logic
-- (which two concurrent requests can both pass under normal isolation).
-- Prisma's schema DSL has no WHERE-clause/partial-index support, so these
-- are hand-written and only documented in a comment on the Payment model.
CREATE UNIQUE INDEX "payment_stripe_pending_unique" ON "Payment"("bookingId")
    WHERE method = 'stripe' AND status = 'pending';

CREATE UNIQUE INDEX "payment_wechat_active_unique" ON "Payment"("bookingId")
    WHERE method = 'wechat_qr' AND status IN ('pending', 'pending_verification');
