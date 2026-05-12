#!/usr/bin/env bash
# AskZakir — VPS bootstrap. Идемпотентно: можно перезапускать.
#
# Использование (на свежем Ubuntu/Debian, под root):
#   curl -fsSL https://raw.githubusercontent.com/SdxSdySdz/askzakir/main/deploy/bootstrap.sh | bash

set -euo pipefail

DOMAIN="askzakir.ru"
ALT_DOMAIN="www.askzakir.ru"
LE_EMAIL="admin@askzakir.ru"
APP_DIR="/opt/askzakir"
REPO="https://github.com/SdxSdySdz/askzakir.git"
NODE_MAJOR="22"
SERVICE_NAME="askzakir"

log()  { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "запускать от root"

log "обновляем пакеты и ставим базу"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ca-certificates gnupg ufw build-essential python3-certbot-nginx

if ! command -v node >/dev/null || ! node --version | grep -q "v${NODE_MAJOR}"; then
  log "ставим Node ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "node $(node --version), npm $(npm --version)"

log "клонируем/обновляем код в ${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --depth 1 "${REPO}" "${APP_DIR}"
else
  git -C "${APP_DIR}" fetch --quiet origin main
  git -C "${APP_DIR}" reset --hard origin/main --quiet
fi

log "ставим зависимости (npm ci --omit=dev)"
cd "${APP_DIR}"
npm ci --omit=dev --silent

if [ ! -f "${APP_DIR}/.env" ]; then
  log "генерируем .env"
  SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  cat > "${APP_DIR}/.env" <<EOF
SESSION_SECRET=${SESSION_SECRET}
PORT=3000
NODE_ENV=production
EOF
  chmod 600 "${APP_DIR}/.env"
else
  log ".env уже есть — не трогаю"
fi

log "systemd unit"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=AskZakir Node service
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=on-failure
RestartSec=5
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
sleep 2
systemctl --no-pager --lines=10 status "${SERVICE_NAME}" || true

log "nginx reverse proxy"
cat > "/etc/nginx/sites-available/${SERVICE_NAME}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${ALT_DOMAIN};

    client_max_body_size 1m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 90;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
nginx -t
systemctl reload nginx

if ufw status 2>/dev/null | grep -q "Status: active"; then
  log "открываем порты в ufw"
  ufw allow 80/tcp  || true
  ufw allow 443/tcp || true
fi

log "проверяем что Node отвечает локально"
curl -fsS -o /dev/null -w "  127.0.0.1:3000 → %{http_code}\n" http://127.0.0.1:3000/ || warn "Node не отвечает"
log "проверяем что nginx отвечает по доменy"
curl -fsS -o /dev/null -w "  http://${DOMAIN} → %{http_code}\n" "http://${DOMAIN}/" || warn "по домену пока не ходит (DNS ещё пропагандируется?)"

log "пробуем поднять HTTPS через Let's Encrypt"
if certbot --nginx -n --agree-tos -m "${LE_EMAIL}" -d "${DOMAIN}" -d "${ALT_DOMAIN}" --redirect; then
  log "✓ HTTPS установлен"
else
  warn "certbot отказал (часто из-за того что DNS ещё не пропагирован)."
  warn "Перезапусти этот скрипт через 10-20 минут, когда askzakir.ru начнёт резолвиться на этот сервер."
fi

log "Готово. Логи приложения: journalctl -u ${SERVICE_NAME} -f"
log "Перезапустить:           systemctl restart ${SERVICE_NAME}"
log "Обновить код:             cd ${APP_DIR} && git pull && systemctl restart ${SERVICE_NAME}"
