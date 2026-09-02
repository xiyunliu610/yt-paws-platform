-- Register POLi as a local payment strategy. Provider API request/response
-- fields are intentionally excluded until the official UAT contract arrives.
ALTER TYPE "PaymentMethod" ADD VALUE 'poli';

CREATE TYPE "PoliAttemptStatus" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'cancelled'
);

CREATE TABLE "PoliTransactionAttempt" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerReference" TEXT,
    "status" "PoliAttemptStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliTransactionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PoliTransactionAttempt_providerReference_key"
    ON "PoliTransactionAttempt"("providerReference");

CREATE INDEX "PoliTransactionAttempt_paymentId_status_idx"
    ON "PoliTransactionAttempt"("paymentId", "status");

ALTER TABLE "PoliTransactionAttempt"
    ADD CONSTRAINT "PoliTransactionAttempt_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match the existing Stripe/WeChat database-level deduplication guarantee:
-- one not-yet-settled POLi Payment per booking. The cross-method
-- payment_booking_paid_unique index already applies to POLi as well.
CREATE UNIQUE INDEX "payment_poli_pending_unique" ON "Payment"("bookingId")
    WHERE method = 'poli' AND status = 'pending';
