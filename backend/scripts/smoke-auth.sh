#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:4002}
EMAIL=${EMAIL:-tester@example.com}

echo "Login as $EMAIL"
tok=$(curl -s -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}" | jq -r '.token')
if [ -z "$tok" ] || [ "$tok" = "null" ]; then
  echo "Failed to get token"; exit 1
fi
echo "Got token: ${tok:0:20}..."

echo "Call protected profile"
curl -s -H "Authorization: Bearer $tok" "$BASE_URL/api/v1/profile" | jq .

echo "Create reading"
curl -s -X POST "$BASE_URL/api/v1/readings" -H 'Content-Type: application/json' -d '{"patient_external_id":"smoke-pr-1","value":110}' | jq .

echo "Smoke auth tests complete"
