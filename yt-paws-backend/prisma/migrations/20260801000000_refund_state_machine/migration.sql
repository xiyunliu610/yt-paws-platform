-- Split into its own migration: Postgres forbids using a newly added enum
-- value in the same transaction it was added in, and the next migration's
-- index predicate references 'refund_pending'.
ALTER TYPE "PaymentStatus" ADD VALUE 'refund_pending';
