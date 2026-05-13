#!/usr/bin/env bash
# AskZakir — one-shot VPS bootstrap. Запускается ОДИН раз на свежем сервере.
# Для последующих деплоев используется deploy/update.sh.
#
# Что делает:
#   - ставит OS-пакеты (Node, nginx, certbot, sops, age, ufw, fail2ban-stub)
#   - клонирует репозиторий
#   - устанавливает npm-зависимости
#   - создаёт systemd unit + nginx server-block
#   - открывает порты 80/443 в ufw
#   - пытается выдать LE-сертификат (если DNS уже резолвится)
#
# Использование (под root):
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

log "обновляем пакеты и ставим базу (nginx, certbot, sops, age, ufw)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl git nginx ca-certificates gnupg ufw build-essential \
  python3-certbot-nginx age

# sops в Debian/Ubuntu иногда нет в apt — ставим бинарником с GitHub releases.
if ! command -v sops >/dev/null; then
  log "ставим sops из GitHub"
  SOPS_VER="v3.9.4"
  ARCH="$(dpkg --print-architecture)"  # amd64 / arm64
  curl -fsSL -o /usr/local/bin/sops \
    "https://github.com/getsops/sops/releases/download/${SOPS_VER}/sops-${SOPS_VER}.linux.${ARCH}"
  chmod +x /usr/local/bin/sops
fi

if ! command -v node >/dev/null || ! node --version | grep -q "v${NODE_MAJOR}"; then
  log "ставим Node ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "node $(node --version), npm $(npm --version), sops $(sops --version | head -1)"

log "клонируем код в ${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --depth 1 "${REPO}" "${APP_DIR}"
else
  warn "${APP_DIR} уже существует — оставляю как есть. Для обновления используй update.sh"
fi

log "ставим зависимости"
cd "${APP_DIR}"
npm ci --omit=dev --silent

# Подготовка каталога для age-ключа. Сам ключ переносится руками или через GH Actions secret.
mkdir -p /etc/sops/age
chmod 700 /etc/sops/age
if [ ! -f /etc/sops/age/keys.txt ]; then
  warn "/etc/sops/age/keys.txt не найден"
  warn "Перенеси приватный age-key с dev-машины (см. .sops.yaml.example в репо)"
  warn "После этого выполни: SOPS_AGE_KEY_FILE=/etc/sops/age/keys.txt deploy/decrypt-env.sh"
fi

if [ ! -f "${APP_DIR}/.env" ] && [ ! -f "${APP_DIR}/.env.sops.yaml" ]; then
  log "генерируем .env (для запуска без sops)"
  SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  cat > "${APP_DIR}/.env" <<EOF
SESSION_SECRET=${SESSION_SECRET}
PORT=3000
NODE_ENV=production
EOF
  chmod 600 "${APP_DIR}/.env"
fi

# Если есть зашифрованный .env.sops.yaml — попробуем расшифровать (мягко, не валим, если нет ключа).
if [ -f "${APP_DIR}/.env.sops.yaml" ] && [ -f /etc/sops/age/keys.txt ]; then
  log "расшифровываем .env.sops.yaml"
  bash "${APP_DIR}/deploy/decrypt-env.sh"
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
  warn "Перезапусти этот скрипт через 10-20 минут."
fi

log "Готово."
log "  Логи:        journalctl -u ${SERVICE_NAME} -f"
log "  Перезапуск:  systemctl restart ${SERVICE_NAME}"
log "  Обновление:  bash ${APP_DIR}/deploy/update.sh"
