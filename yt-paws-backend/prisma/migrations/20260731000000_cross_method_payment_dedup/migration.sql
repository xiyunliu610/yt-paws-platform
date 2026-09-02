-- Payment.status gains "cancelled": a payment attempt voided without money
-- changing hands, either superseded by the customer switching payment
-- method, or the losing side of a genuine cross-method double-payment race.
ALTER TYPE "PaymentStatus" ADD VALUE 'cancelled';
