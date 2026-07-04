#!/bin/bash
# Production deploy for the VPS. Runs in-place in the current release dir and
# serves via the Next.js standalone server under PM2 (ecosystem.config.js).
# Canonical source: scripts/deploy.sh in the repo. The live copy at
# /opt/reserve-kursk/deploy.sh self-syncs from it on every deploy (see below),
# so edits to scripts/deploy.sh take effect on the NEXT deploy.
set -euo pipefail
cd /opt/reserve-kursk/current

echo '[1/6] Pulling latest code...'
git pull origin main

# Keep the live deploy script in sync with the repo for the next run.
install -m 755 scripts/deploy.sh /opt/reserve-kursk/deploy.sh 2>/dev/null || true

echo '[2/6] Installing dependencies...'
# Drop stale npm temp dirs that can wedge a re-run (ENOTEMPTY), then install.
# Fall back to a full clean reinstall if npm ci still fails.
find node_modules -maxdepth 1 -name '.*-*' -type d -exec rm -rf {} + 2>/dev/null || true
npm ci --omit=dev || { echo 'npm ci failed — clean reinstall...'; rm -rf node_modules; npm ci --omit=dev; }

echo '[3/6] Running database migrations...'
npx prisma migrate deploy

echo '[4/6] Building...'
# Turbopack can't follow the uploads symlink (points outside the project), so
# move it aside for the build and ALWAYS restore it — even if the build fails.
UPLOADS_MOVED=0
if [ -e public/uploads ]; then mv public/uploads /tmp/uploads_backup; UPLOADS_MOVED=1; fi
restore_uploads() { if [ "$UPLOADS_MOVED" = "1" ] && [ ! -e public/uploads ]; then mv /tmp/uploads_backup public/uploads; fi; }
trap restore_uploads EXIT
# Always build from a clean .next: a stale .next can silently produce an
# incomplete standalone bundle (missing *_client-reference-manifest.js), which
# 500s at runtime even though `next build` exits 0. Retry once on hard failure.
rm -rf .next
npx next build || { echo 'build failed — retrying once...'; rm -rf .next; npx next build; }
restore_uploads
trap - EXIT

echo '[5/6] Assembling standalone bundle...'
# The standalone server resolves static assets and public/ relative to itself.
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo '[6/6] Restarting PM2...'
# The app runs in fork mode, where `pm2 reload` gives no real zero-downtime and
# has repeatedly left the new worker with a stale view of the standalone bundle
# (InvariantError: client reference manifest ... does not exist) on dynamic
# routes. A hard restart reliably picks up the freshly-assembled bundle.
pm2 restart ecosystem.config.js --update-env 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

echo 'Health check...'
sleep 3
# Probe a DYNAMIC route with client components (not just /restaurants, which is
# always 200) so a missing-manifest regression fails the deploy instead of
# silently 500ing in prod. Discover a real slug, then hit its /book page.
OK=0
SLUG=$(curl -fsS http://127.0.0.1:3000/restaurants 2>/dev/null | grep -oE '/restaurants/[a-z0-9-]+"' | head -1 | tr -d '"' || true)
PROBE="/restaurants${SLUG:+${SLUG#/restaurants}/book}"
[ "$PROBE" = "/restaurants/book" ] && PROBE="/restaurants"
for i in 1 2 3 4 5 6 7 8; do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000/restaurants" && curl -fsS -o /dev/null "http://127.0.0.1:3000${PROBE}"; then OK=1; break; fi
  sleep 2
done
if [ "$OK" != "1" ]; then
  echo "ERROR: app not healthy after deploy (probe: ${PROBE})."
  pm2 logs kaifbook --lines 25 --nostream || true
  exit 1
fi
echo "Health check OK (probe: ${PROBE})"

echo 'Deploy complete!'
pm2 list
