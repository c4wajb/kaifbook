#!/bin/bash
set -e

cd /opt/reserve-kursk/current

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building Docker images..."
docker compose build

echo "==> Restarting services..."
docker compose up -d

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Done!"
docker compose ps
