#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-9876}"
HOST="${HOST:-127.0.0.1}"

echo "Serving ServiceNow docs graph at http://${HOST}:${PORT}/viewer/"
python3 -m http.server "$PORT" --bind "$HOST"
