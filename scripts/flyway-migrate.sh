#!/usr/bin/env bash
set -euo pipefail

# Usage: HOST PORT DB USER PASSWORD
HOST=${1:-localhost}
PORT=${2:-5432}
DB=${3:-dmonitor}
USER=${4:-dmonitor}
PASSWORD=${5:-dmonitor}

# Mount migrations directory into /flyway/sql
MIGRATIONS_DIR=$(cd "$(dirname "$0")/.." && pwd)/migrations

docker run --rm \
  -v "$MIGRATIONS_DIR":/flyway/sql \
  flyway/flyway:9 migrate \
  -url=jdbc:postgresql://$HOST:$PORT/$DB \
  -user=$USER \
  -password=$PASSWORD
