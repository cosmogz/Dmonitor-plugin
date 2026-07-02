#!/usr/bin/env bash
set -euo pipefail

# Quick integration test: brings up docker-compose, runs migrations, starts server, exercises endpoints

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

export COMPOSE_HTTP_TIMEOUT=200
npm run compose:up

# wait for Postgres
echo "Waiting for Postgres..."
until pg_isready -q -h localhost -p 5432; do
  sleep 1
done

export DATABASE_URL=postgresql://dmonitor:dmonitor@localhost:5432/dmonitor
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=replace-me-with-a-secure-secret

echo "Running migrations..."
npm run migrate

echo "Building..."
npm run build

# start server in background
node dist/main.js &
SERVER_PID=$!
trap 'kill $SERVER_PID || true; npm run compose:down' EXIT

# wait for health
echo "Waiting for service health..."
until curl -sS http://localhost:3000/health | grep -q ok; do
  sleep 1
done

# create patient link
echo "Creating patient link..."
LINK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/patients/link -H "Authorization: Bearer $JWT_SECRET" -H 'Content-Type: application/json' -d '{"patientId":"patient-123","nationalId":"NAT-123","name":"Test Patient"}')
echo "Link response: $LINK_RESPONSE"

# send reading
echo "Sending reading..."
READING_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/readings -H "Authorization: Bearer $JWT_SECRET" -H 'Content-Type: application/json' -d '{"patientId":"patient-123","timestamp":"2026-07-02T12:00:00.000Z","glucoseValue":12.5,"units":"mmol/L"}')
echo "Reading response: $READING_RESPONSE"

# query alerts
echo "Query alerts..."
ALERTS=$(curl -s http://localhost:3000/api/v1/alerts?patientId=patient-123 -H "Authorization: Bearer $JWT_SECRET")
echo "Alerts: $ALERTS"

# success
echo "Integration test completed."

# cleanup handled by trap
exit 0
