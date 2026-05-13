#!/usr/bin/env bash
# Расшифровка .env.sops.yaml → .env. Вызывается из update.sh перед рестартом сервиса.
# Идемпотентно: если зашифрованного файла нет — оставляет существующий .env как есть.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/askzakir}"
AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/sops/age/keys.txt}"
ENC="${APP_DIR}/.env.sops.yaml"
OUT="${APP_DIR}/.env"

if [ ! -f "${ENC}" ]; then
  echo "decrypt-env: no ${ENC} found — оставляю существующий ${OUT}"
  exit 0
fi

if ! command -v sops >/dev/null; then
  echo "decrypt-env: sops not installed" >&2
  exit 1
fi
if [ ! -r "${AGE_KEY_FILE}" ]; then
  echo "decrypt-env: age key not readable at ${AGE_KEY_FILE}" >&2
  exit 1
fi

SOPS_AGE_KEY_FILE="${AGE_KEY_FILE}" sops -d "${ENC}" > "${OUT}.tmp"
chmod 600 "${OUT}.tmp"
mv "${OUT}.tmp" "${OUT}"
echo "decrypt-env: ${OUT} обновлён из ${ENC}"
