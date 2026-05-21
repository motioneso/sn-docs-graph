# ServiceNow Docs Knowledge Graph

This repo contains a Graphify knowledge graph generated from the ServiceNow docs corpus.

## Contents

- `snapshots/latest/graph.json` - graph data, currently 50,059 nodes and 95,705 links.
- `snapshots/latest/GRAPH_REPORT.md` - generated graph analysis report.
- `snapshots/latest/community_label_metadata.json` - community-labeling run metadata.
- `viewer/` - lightweight local browser viewer for searching and inspecting the graph.
- `scripts/update_snapshot.sh` - refreshes this repo from the local Graphify snapshot output.
- `scripts/serve.sh` - starts a local static server for the viewer.

## Clone Requirements

This repo uses Git LFS for `snapshots/latest/graph.json`.

Install Git LFS before cloning or pulling updates:

```bash
git lfs install
```

Then clone normally. If you already cloned before installing LFS, run:

```bash
git lfs pull
```

## Use The Viewer

From this repo:

```bash
./scripts/serve.sh
```

Then open:

```text
http://127.0.0.1:9876/viewer/
```

The viewer loads `snapshots/latest/graph.json`, indexes node labels/source files/publications, and renders a focused neighborhood around the selected node. It intentionally does not draw all nodes at once.

## Update From A New Snapshot

On the machine that has the Graphify output mounted:

```bash
./scripts/update_snapshot.sh
git status
git add snapshots/latest
git commit -m "Update ServiceNow docs graph snapshot"
git push
```

Coworkers can then update with:

```bash
git pull
```

## Notes

The graph data is a generated artifact derived from the ServiceNow docs corpus. This repo is intended for internal sharing.
