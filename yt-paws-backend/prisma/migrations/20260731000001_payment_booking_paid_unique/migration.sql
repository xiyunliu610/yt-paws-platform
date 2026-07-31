-- At most one "paid" Payment per booking across ALL methods. The existing
-- payment_stripe_pending_unique / payment_wechat_active_unique indexes only
-- dedupe *within* a method — a Stripe payment reaching "paid" via the
-- webhook and a WeChat payment independently reaching "paid" via owner
-- verification, for the same booking, was previously not prevented at all.
CREATE UNIQUE INDEX "payment_booking_paid_unique" ON "Payment"("bookingId")
    WHERE status = 'paid';
