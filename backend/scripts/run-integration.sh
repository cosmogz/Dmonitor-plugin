#!/usr/bin/env bash
set -euo pipefail

echo "Starting Postgres and Redis via Docker for integration tests..."

docker run --name dmonitor-test-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dmonitor -p 5432:5432 -d postgres:15 || true
docker run --name dmonitor-test-redis -p 6379:6379 -d redis:7 || true

echo "Waiting for Postgres..."
for i in {1..30}; do
  if pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1; then
    echo "Postgres ready"; break
  fi
  sleep 1
done

echo "Waiting for Redis..."
for i in {1..30}; do
  if redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
    echo "Redis ready"; break
  fi
  sleep 1
done

echo "Running integration tests..."
cd "$(dirname "$0")/.."
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/dmonitor
export REDIS_URL=redis://127.0.0.1:6379
npm install --no-audit --no-fund
npm run test:integration

echo "Cleaning up containers..."
docker rm -f dmonitor-test-postgres dmonitor-test-redis || true

echo "Done."
