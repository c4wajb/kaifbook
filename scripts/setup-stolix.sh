#!/bin/bash
# Setup stolix.ru on the VPS (run as root on 161.104.45.65)
#
# Prerequisites:
# 1. DNS: A-record for stolix.ru → 161.104.45.65
# 2. DNS: A-record for www.stolix.ru → 161.104.45.65
#
# Usage: bash setup-stolix.sh

set -euo pipefail

echo "=== Setting up stolix.ru ==="

# 1. Get SSL certificate
echo "[1/4] Obtaining SSL certificate..."
if [ ! -f /etc/letsencrypt/live/stolix.ru/fullchain.pem ]; then
  certbot certonly --nginx -d stolix.ru -d www.stolix.ru --non-interactive --agree-tos --email admin@kaifbook.ru
  echo "  SSL certificate obtained."
else
  echo "  SSL certificate already exists."
fi

# 2. Install nginx config
echo "[2/4] Installing nginx config..."
cp /opt/reserve-kursk/current/scripts/nginx-stolix.conf /etc/nginx/sites-available/stolix.conf
ln -sf /etc/nginx/sites-available/stolix.conf /etc/nginx/sites-enabled/stolix.conf
echo "  Config installed."

# 3. Test nginx config
echo "[3/4] Testing nginx config..."
nginx -t

# 4. Reload nginx
echo "[4/4] Reloading nginx..."
systemctl reload nginx

echo ""
echo "=== Done! ==="
echo "stolix.ru is now live."
echo ""
echo "Available pages:"
echo "  https://stolix.ru/           → Owner dashboard (redirect)"
echo "  https://stolix.ru/owner      → Restaurant management"
echo "  https://stolix.ru/admin      → Platform admin panel"
echo "  https://stolix.ru/server     → Server monitoring (no login needed)"
echo "  https://stolix.ru/owner/login → Login page"
