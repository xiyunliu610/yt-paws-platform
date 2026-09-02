#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must point to a disposable empty database}"
test -f "$BACKUP_FILE"
test -f "$BACKUP_FILE.sha256"
shasum -a 256 --check "$BACKUP_FILE.sha256"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
psql "$RESTORE_DATABASE_URL" --set ON_ERROR_STOP=1 --tuples-only --command='SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;'
psql "$RESTORE_DATABASE_URL" --set ON_ERROR_STOP=1 --command='SELECT 1 FROM "Business" LIMIT 1;'
echo "Restore verification passed; destroy the disposable database after recording evidence."
