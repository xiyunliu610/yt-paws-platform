-- Full-refund flow: Payment gains refund metadata (when, why, who — V1
-- only supports refunding a Payment in full, not partial amounts).
ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundedById" UUID;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refundedById_fkey"
    FOREIGN KEY ("refundedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Captured from the webhook when a Checkout Session completes — needed to
-- issue a Stripe refund later (refunds are made against the PaymentIntent,
-- not the Checkout Session id already stored on this row).
ALTER TABLE "StripeCheckoutAttempt" ADD COLUMN "paymentIntentId" TEXT;
