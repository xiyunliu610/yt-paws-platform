-- V1 is intentionally a single-business deployment. Application-level
-- count-before-create checks are racy, so make the invariant atomic in the
-- database. Drop this index only as part of the future multi-business launch,
-- together with customer-side business selection and tenant-scoped discovery.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Business") > 1 THEN
    RAISE EXCEPTION 'Cannot enforce V1 single-business invariant: Business contains more than one row. Audit and reconcile tenant data before retrying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "business_singleton_unique" ON "Business" ((true));
