#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DMONITOR_URL:-}" ]; then
  DMONITOR_URL=http://localhost:3000
fi
if [ -z "${JWT_SECRET:-}" ]; then
  echo "Please export JWT_SECRET"
  exit 1
fi

curl -s -X POST "$DMONITOR_URL/api/v1/readings" \
  -H "Authorization: Bearer $JWT_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "patientId": "patient-123",
    "timestamp": "2026-07-02T12:00:00.000Z",
    "glucoseValue": 6.5,
    "units": "mmol/L",
    "deviceId": "glucometer-001",
    "context": {
      "mealType": "post-meal",
      "insulinDoseMg": 10,
      "exerciseMinutes": 20,
      "symptoms": ["headache"],
      "notes": "Routine afternoon check"
    }
  }'

echo
