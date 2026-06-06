#!/bin/bash
set -e

cd /opt/reserve-kursk/current

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building Docker image..."
docker compose build --no-cache app

echo "==> Starting services..."
docker compose up -d

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Done! Checking status..."
docker compose ps
