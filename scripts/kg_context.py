#!/usr/bin/env python3
"""Extract focused ServiceNow knowledge graph context for LLM prompts."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
GRAPH_PATH = REPO_ROOT / "snapshots" / "latest" / "graph.json"


def load_graph(path: Path) -> tuple[list[dict], list[dict]]:
    graph = json.loads(path.read_text())
    return graph.get("nodes", []), graph.get("links", [])


def node_text(node: dict) -> str:
    return " ".join(
        str(node.get(key, "") or "")
        for key in ("label", "id", "publication", "source_file", "file_type")
    ).lower()


def build_adjacency(links: list[dict]) -> dict[str, list[tuple[str, dict]]]:
    adjacency: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for link in links:
        source = str(link.get("source", "") or "")
        target = str(link.get("target", "") or "")
        if not source or not target:
            continue
        adjacency[source].append((target, link))
        adjacency[target].append((source, link))
    return adjacency


def search(nodes: list[dict], adjacency: dict[str, list], query: str, limit: int) -> list[dict]:
    terms = [term for term in query.lower().split() if term]
    matches = []
    for node in nodes:
        text = node_text(node)
        if all(term in text for term in terms):
            score = len(adjacency.get(str(node.get("id")), []))
            matches.append((score, node))
    matches.sort(key=lambda item: item[0], reverse=True)
    return [node for _, node in matches[:limit]]


def neighborhood(
    seed_ids: list[str],
    node_by_id: dict[str, dict],
    adjacency: dict[str, list[tuple[str, dict]]],
    depth: int,
    limit: int,
) -> tuple[list[dict], list[dict]]:
    unlimited = limit <= 0
    seen = set(seed_ids)
    queue = [(seed_id, 0) for seed_id in seed_ids]
    link_candidates: list[dict] = []

    while queue and (unlimited or len(seen) < limit):
        current, current_depth = queue.pop(0)
        for neighbor, link in adjacency.get(current, []):
            link_candidates.append(link)
            if (
                neighbor not in seen
                and current_depth < depth
                and (unlimited or len(seen) < limit)
            ):
                seen.add(neighbor)
                queue.append((neighbor, current_depth + 1))

    nodes = [node_by_id[node_id] for node_id in seen if node_id in node_by_id]
    links = []
    seen_links = set()
    for link in link_candidates:
        if str(link.get("source")) not in seen or str(link.get("target")) not in seen:
            continue
        key = (
            str(link.get("source")),
            str(link.get("target")),
            str(link.get("relation")),
        )
        if key in seen_links:
            continue
        seen_links.add(key)
        links.append(link)
        if not unlimited and len(links) >= limit * 3:
            break
    return nodes, links


def compact_node(node: dict, degree: int) -> dict:
    return {
        "id": node.get("id"),
        "label": node.get("label"),
        "publication": node.get("publication"),
        "community": node.get("community"),
        "source_file": node.get("source_file"),
        "degree": degree,
    }


def markdown_output(result: dict) -> str:
    lines = [
        f"# Knowledge Graph Context: {result['query']}",
        "",
        "## Matched Nodes",
    ]
    for node in result["matches"]:
        lines.append(
            f"- {node['label']} (`{node['id']}`), publication={node.get('publication')}, "
            f"degree={node.get('degree')}, source={node.get('source_file')}"
        )
    lines.extend(["", "## Neighborhood Nodes"])
    for node in result["nodes"]:
        lines.append(
            f"- {node['label']} (`{node['id']}`), publication={node.get('publication')}, "
            f"community={node.get('community')}, degree={node.get('degree')}"
        )
    lines.extend(["", "## Relationships"])
    for link in result["links"]:
        lines.append(
            f"- `{link.get('source')}` --{link.get('relation')}--> `{link.get('target')}` "
            f"confidence={link.get('confidence')}"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", help="Search terms, e.g. 'CMDB service graph'")
    parser.add_argument("--matches", type=int, default=8, help="Number of seed matches")
    parser.add_argument("--depth", type=int, default=1, choices=(1, 2), help="Neighborhood depth")
    parser.add_argument(
        "--limit",
        type=int,
        default=120,
        help="Maximum neighborhood nodes; use 0 for no cap",
    )
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown")
    args = parser.parse_args()

    nodes, links = load_graph(GRAPH_PATH)
    node_by_id = {str(node.get("id")): node for node in nodes if node.get("id")}
    adjacency = build_adjacency(links)
    matches = search(nodes, adjacency, args.query, args.matches)
    seed_ids = [str(node.get("id")) for node in matches if node.get("id")]
    neighborhood_nodes, neighborhood_links = neighborhood(
        seed_ids, node_by_id, adjacency, args.depth, args.limit
    )

    result = {
        "query": args.query,
        "matches": [
            compact_node(node, len(adjacency.get(str(node.get("id")), [])))
            for node in matches
        ],
        "nodes": [
            compact_node(node, len(adjacency.get(str(node.get("id")), [])))
            for node in sorted(
                neighborhood_nodes,
                key=lambda item: len(adjacency.get(str(item.get("id")), [])),
                reverse=True,
            )
        ],
        "links": neighborhood_links,
    }

    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        print(markdown_output(result), end="")


if __name__ == "__main__":
    main()
