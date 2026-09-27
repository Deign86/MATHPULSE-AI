#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="$ROOT_DIR/app.py"
PID_FILE="$ROOT_DIR/.space_app.pid"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "Stopping existing app process: $OLD_PID"
    kill "$OLD_PID" || true
    sleep 1
  fi
fi

echo "Starting app.py in background"
nohup python "$APP_PATH" > "$ROOT_DIR/.space_app.log" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo "App reloaded with PID $NEW_PID"
