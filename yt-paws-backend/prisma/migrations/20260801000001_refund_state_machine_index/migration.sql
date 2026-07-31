-- Stripe's refund id, for audit/support lookups (see the comment on
-- Payment.stripeRefundId in schema.prisma).
ALTER TABLE "Payment" ADD COLUMN "stripeRefundId" TEXT;

-- Widen payment_booking_paid_unique to also cover refund_pending: a refund
-- actually in flight with Stripe still reserves the booking's "one payment
-- holding the money" slot, so a new payment can't reach `paid` for the same
-- booking while an old one's refund is being processed.
DROP INDEX "payment_booking_paid_unique";
CREATE UNIQUE INDEX "payment_booking_paid_unique" ON "Payment"("bookingId")
    WHERE status IN ('paid', 'refund_pending');
