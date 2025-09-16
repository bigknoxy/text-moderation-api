#!/usr/bin/env bash
set -euo pipefail
REDIS_HOST=${1:-127.0.0.1}
REDIS_PORT=${2:-6379}
LUA_PATH=${3:-src/services/auth/token_bucket.lua}

if ! command -v redis-cli >/dev/null; then
  echo "redis-cli not found. Install redis-tools (Ubuntu: sudo apt-get install -y redis-tools)"
  exit 2
fi

sha=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SCRIPT LOAD "$(cat "$LUA_PATH")")
echo "$sha"
