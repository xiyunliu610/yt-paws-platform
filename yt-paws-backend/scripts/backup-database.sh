#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR must be an explicit backup directory}"
case "$BACKUP_DIR" in /) echo "Refusing filesystem root as backup target" >&2; exit 1;; esac
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/ytpaws-$timestamp.dump"
pg_dump --format=custom --no-owner --no-acl --file="$target" "$DATABASE_URL"
shasum -a 256 "$target" > "$target.sha256"
echo "$target"
