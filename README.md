# ServiceNow Docs Knowledge Graph

This repo contains a Graphify knowledge graph generated from the ServiceNow Australia docs corpus.

## Contents

- `snapshots/latest/graph.json` - graph data, currently 50,059 nodes and 95,705 links.
- `snapshots/latest/GRAPH_REPORT.md` - generated graph analysis report.
- `snapshots/latest/community_label_metadata.json` - community-labeling run metadata.
- `viewer/` - lightweight local browser viewer for searching and inspecting the graph.
- `scripts/update_snapshot.sh` - refreshes this repo from the local Graphify snapshot output.
- `scripts/serve.sh` - starts a local static server for the viewer.
- `scripts/kg_context.py` - extracts focused graph context for Claude, Codex, ChatGPT, or other LLM tools.

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

## Connect An LLM To The Graph

The best pattern is retrieval-first: do not paste the full `graph.json` into a chat. It is large, and most questions only need a small neighborhood of the graph plus the generated report.

Use `scripts/kg_context.py` to extract focused context:

```bash
./scripts/kg_context.py "CMDB service graph"
./scripts/kg_context.py "IntegrationHub spokes" --depth 2 --limit 200
./scripts/kg_context.py "workflow automation" --format json > /tmp/kg-context.json
```

Then give the output to your LLM with a prompt like:

```text
Use the ServiceNow docs knowledge graph context below as evidence.
Answer from this context first. If the context is insufficient, say what
additional node, publication, or source file should be inspected next.
```

### Codex CLI

From this repo:

```bash
./scripts/kg_context.py "CMDB service graph" --depth 2 --limit 200 > /tmp/kg-context.md
codex --cd "$(pwd)" "Use /tmp/kg-context.md and snapshots/latest/GRAPH_REPORT.md to explain the CMDB Service Graph concepts and their related ServiceNow capabilities."
```

For a deeper code-agent workflow, ask Codex to run `scripts/kg_context.py` itself:

```bash
codex --cd "$(pwd)" "Use scripts/kg_context.py to inspect the graph for IntegrationHub spokes, then summarize the key products, source publications, and relationships."
```

### Claude Code

From this repo:

```bash
./scripts/kg_context.py "employee service management" --depth 2 --limit 200 > /tmp/kg-context.md
claude "Use /tmp/kg-context.md and snapshots/latest/GRAPH_REPORT.md to summarize the Employee Service Management area of this ServiceNow docs graph."
```

Or start Claude Code in the repo and ask it to call the helper:

```bash
claude
```

Prompt:

```text
Run scripts/kg_context.py for "order management" with depth 2, then use the result and GRAPH_REPORT.md to explain the important relationships.
```

### ChatGPT, Gemini, Or Other LLMs

For tools that can read local files, attach or expose these files:

- `snapshots/latest/GRAPH_REPORT.md`
- focused output from `scripts/kg_context.py`
- optionally `snapshots/latest/graph.json` when the tool supports large local files or retrieval

For tools that cannot run local commands, paste the Markdown output from `scripts/kg_context.py` into the chat.

### MCP Or RAG Integrations

If you are wiring this into an agent, retrieval service, or MCP server, use the same contract:

1. Search nodes by `label`, `id`, `publication`, and `source_file`.
2. Select the highest-degree or most relevant matches as seed nodes.
3. Return a one- or two-hop neighborhood from `links`.
4. Include `source_file`, `publication`, `community`, and `relation` values in the response.
5. Use `GRAPH_REPORT.md` as global summary context.

The helper script is intentionally dependency-free so it can be wrapped by an MCP tool, shell command, notebook, or simple API.

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
