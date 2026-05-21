#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${SOURCE:-/mnt/wd250/jarvis-kb/servicenow-docs/graphify-snapshots/latest}"
TARGET="$REPO_ROOT/snapshots/latest"

if [ ! -d "$SOURCE" ]; then
  echo "Snapshot source does not exist: $SOURCE" >&2
  exit 1
fi

mkdir -p "$TARGET"

for name in graph.json GRAPH_REPORT.md community_label_metadata.json; do
  if [ ! -f "$SOURCE/$name" ]; then
    echo "Missing required snapshot file: $SOURCE/$name" >&2
    exit 1
  fi
done

cp "$SOURCE/graph.json" "$TARGET/graph.json"
cp "$SOURCE/GRAPH_REPORT.md" "$TARGET/GRAPH_REPORT.md"
cp "$SOURCE/community_label_metadata.json" "$TARGET/community_label_metadata.json"

python3 "$REPO_ROOT/scripts/write_snapshot_info.py"
echo "Updated $TARGET from $SOURCE"
