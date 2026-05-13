#!/usr/bin/env bash
# AskZakir — обновление кода. Запускается на каждый деплой.
# Идемпотентно. Не трогает OS-пакеты, nginx-конфиг, сертификаты, systemd-unit.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/askzakir}"
SERVICE_NAME="${SERVICE_NAME:-askzakir}"

log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "запускать от root"; exit 1; }
[ -d "${APP_DIR}/.git" ] || { echo "${APP_DIR}/.git не найден. Запустите bootstrap.sh сначала."; exit 1; }

log "обновляем код"
git -C "${APP_DIR}" fetch --quiet origin main
git -C "${APP_DIR}" reset --hard origin/main --quiet

log "ставим зависимости"
cd "${APP_DIR}"
npm ci --omit=dev --silent

# Если есть зашифрованный .env.sops.yaml — расшифровываем перед рестартом.
if [ -f "${APP_DIR}/.env.sops.yaml" ]; then
  log "обновляем .env из .env.sops.yaml"
  bash "${APP_DIR}/deploy/decrypt-env.sh"
fi

log "рестартим сервис"
systemctl restart "${SERVICE_NAME}"
sleep 2

log "health-check"
for i in 1 2 3 4 5; do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/me || echo 000)
  if [ "$code" = "200" ] || [ "$code" = "401" ]; then
    log "✓ сервис отвечает ($code)"
    exit 0
  fi
  echo "  attempt $i: $code, retry…"
  sleep 2
done

echo "✗ сервис не отвечает 5 раз подряд — смотри journalctl -u ${SERVICE_NAME}" >&2
exit 1
