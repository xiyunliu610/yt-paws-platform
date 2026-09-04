-- Extend the provider-neutral POC with only fields present in POLi's
-- official UAT/OpenAPI contract.
ALTER TYPE "PoliAttemptStatus" ADD VALUE 'payment_pending';
ALTER TYPE "PoliAttemptStatus" ADD VALUE 'receipt_unverified';
ALTER TYPE "PoliAttemptStatus" ADD VALUE 'timed_out';

ALTER TABLE "PoliTransactionAttempt"
    ADD COLUMN "token" TEXT,
    ADD COLUMN "navigateUrl" TEXT,
    ADD COLUMN "returnUrl" TEXT,
    ADD COLUMN "providerStatus" TEXT,
    ADD COLUMN "amountPaid" DECIMAL(10,2),
    ADD COLUMN "errorCode" INTEGER,
    ADD COLUMN "errorMessage" TEXT,
    ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
    ADD COLUMN "notificationAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PoliTransactionAttempt_token_key"
    ON "PoliTransactionAttempt"("token");

-- An initiation retry reuses an active attempt instead of creating several
-- simultaneously payable POLi transactions for one Payment.
CREATE UNIQUE INDEX "poli_attempt_payment_active_unique"
    ON "PoliTransactionAttempt"("paymentId")
    WHERE status IN ('pending', 'payment_pending');

-- ReceiptUnverified means money may have moved and must block another POLi
-- Payment until the merchant reconciles it.
DROP INDEX "payment_poli_pending_unique";
CREATE UNIQUE INDEX "payment_poli_active_unique" ON "Payment"("bookingId")
    WHERE method = 'poli' AND status IN ('pending', 'pending_verification');
