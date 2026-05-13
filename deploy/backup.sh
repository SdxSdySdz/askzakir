#!/usr/bin/env bash
# AskZakir — ежедневный бэкап БД. Прописывается в cron.
# Сейчас (Phase 0) — простой dump SQLite-файла в локальную папку с ротацией 30 дней.
# В Phase 2 здесь будет pg_dump | gzip | aws s3 cp - в S3-совместимое хранилище в РФ.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/askzakir}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/askzakir}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

DB="${APP_DIR}/data.db"
[ -f "${DB}" ] || { echo "no DB at ${DB}, skipping"; exit 0; }

TS=$(date +%Y%m%d-%H%M%S)
OUT="${BACKUP_DIR}/data-${TS}.db"

# better-sqlite3 / SQLite WAL: правильный snapshot через `.backup`-команду.
sqlite3 "${DB}" ".backup '${OUT}'"
gzip "${OUT}"
echo "backed up to ${OUT}.gz"

# Чистим старое.
find "${BACKUP_DIR}" -name 'data-*.db.gz' -mtime "+${RETENTION_DAYS}" -delete

# Phase 2 TODO: добавить аплоад в Selectel/TimeWeb S3:
#   aws --endpoint-url=https://s3.timeweb.cloud s3 cp "${OUT}.gz" s3://askzakir-backups/
