#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DMONITOR_URL:-}" ]; then
  DMONITOR_URL=http://localhost:3000
fi

curl -s "$DMONITOR_URL/health" && echo
echo "Version:" && curl -s "$DMONITOR_URL/version" && echo
