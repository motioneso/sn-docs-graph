#!/usr/bin/env python3
"""Write a compact snapshot summary for the shareable graph repo."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_DIR = REPO_ROOT / "snapshots" / "latest"
GRAPH_PATH = SNAPSHOT_DIR / "graph.json"
LABEL_META_PATH = SNAPSHOT_DIR / "community_label_metadata.json"
INFO_PATH = SNAPSHOT_DIR / "snapshot-info.json"


def main() -> None:
    graph = json.loads(GRAPH_PATH.read_text())
    label_meta = json.loads(LABEL_META_PATH.read_text())
    nodes = graph.get("nodes", [])
    links = graph.get("links", [])
    communities = {
        node.get("community")
        for node in nodes
        if node.get("community") is not None
    }
    info = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "nodes": len(nodes),
        "links": len(links),
        "communities": len(communities),
        "community_label_metadata": label_meta,
    }
    INFO_PATH.write_text(json.dumps(info, indent=2) + "\n")


if __name__ == "__main__":
    main()
