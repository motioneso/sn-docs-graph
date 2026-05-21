(function () {
  const graphUrl = "../snapshots/latest/graph.json";
  const statusEl = document.getElementById("status");
  const searchEl = document.getElementById("search");
  const depthEl = document.getElementById("depth");
  const limitEl = document.getElementById("limit");
  const resultsEl = document.getElementById("results");
  const detailsEl = document.getElementById("details");
  const canvas = document.getElementById("graph");
  const ctx = canvas.getContext("2d");

  let graph = null;
  let nodeById = new Map();
  let adjacency = new Map();
  let selectedId = null;
  let activeResults = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawNeighborhood();
  }

  function text(value) {
    return String(value || "");
  }

  function buildIndexes(data) {
    nodeById = new Map();
    adjacency = new Map();

    for (const node of data.nodes || []) {
      nodeById.set(node.id, node);
      adjacency.set(node.id, []);
    }

    for (const link of data.links || []) {
      const source = text(link.source);
      const target = text(link.target);
      if (!adjacency.has(source) || !adjacency.has(target)) continue;
      adjacency.get(source).push({ id: target, link });
      adjacency.get(target).push({ id: source, link });
    }

    for (const node of data.nodes || []) {
      node.degree = adjacency.get(node.id)?.length || 0;
      node.searchText = [
        node.label,
        node.id,
        node.publication,
        node.source_file,
        node.file_type,
      ].map(text).join(" ").toLowerCase();
    }
  }

  function searchNodes(query) {
    const q = query.trim().toLowerCase();
    const nodes = graph.nodes || [];
    if (!q) {
      return nodes.slice().sort((a, b) => b.degree - a.degree).slice(0, 20);
    }
    return nodes
      .filter((node) => node.searchText.includes(q))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 40);
  }

  function renderResults() {
    activeResults = searchNodes(searchEl.value);
    resultsEl.innerHTML = "";

    if (!activeResults.length) {
      resultsEl.innerHTML = '<div class="meta">No matches.</div>';
      return;
    }

    for (const node of activeResults) {
      const button = document.createElement("button");
      button.className = "result" + (node.id === selectedId ? " active" : "");
      button.innerHTML = `
        <strong>${escapeHtml(node.label || node.id)}</strong>
        <div class="meta">${escapeHtml(node.publication || "unknown")} · degree ${node.degree}</div>
        <div class="meta">${escapeHtml(node.source_file || "")}</div>
      `;
      button.addEventListener("click", () => selectNode(node.id));
      resultsEl.appendChild(button);
    }
  }

  function selectNode(id) {
    selectedId = id;
    const node = nodeById.get(id);
    if (!node) return;
    detailsEl.innerHTML = `
      <strong>${escapeHtml(node.label || node.id)}</strong>
      <div class="meta">ID: ${escapeHtml(node.id)}</div>
      <div class="meta">Publication: ${escapeHtml(node.publication || "unknown")}</div>
      <div class="meta">Community: ${escapeHtml(node.community ?? "unknown")}</div>
      <div class="meta">Degree: ${node.degree}</div>
      <div class="meta">Source: ${escapeHtml(node.source_file || "")}</div>
    `;
    renderResults();
    drawNeighborhood();
  }

  function collectNeighborhood() {
    if (!selectedId || !nodeById.has(selectedId)) {
      return { nodes: [], links: [] };
    }
    const maxDepth = Number(depthEl.value);
    const maxNodes = Number(limitEl.value);
    const seen = new Set([selectedId]);
    const queue = [{ id: selectedId, depth: 0 }];
    const links = [];

    while (queue.length && seen.size < maxNodes) {
      const current = queue.shift();
      const neighbors = adjacency.get(current.id) || [];
      for (const edge of neighbors) {
        if (links.length < maxNodes * 2) links.push(edge.link);
        if (!seen.has(edge.id) && current.depth < maxDepth && seen.size < maxNodes) {
          seen.add(edge.id);
          queue.push({ id: edge.id, depth: current.depth + 1 });
        }
      }
    }

    return {
      nodes: Array.from(seen).map((id) => nodeById.get(id)).filter(Boolean),
      links,
    };
  }

  function drawNeighborhood() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#f7f7f4";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!graph) return;
    if (!selectedId) {
      drawEmpty("Search or choose a node to render its neighborhood.");
      return;
    }

    const sub = collectNeighborhood();
    if (!sub.nodes.length) {
      drawEmpty("No neighborhood found.");
      return;
    }

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.max(80, Math.min(rect.width, rect.height) * 0.38);
    const positions = new Map();
    const center = nodeById.get(selectedId);
    positions.set(selectedId, { x: cx, y: cy });

    const others = sub.nodes.filter((node) => node.id !== selectedId);
    others.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, others.length);
      const degreeScale = Math.max(0.25, 1 - Math.min(node.degree, 80) / 140);
      const r = radius * (0.55 + 0.45 * degreeScale);
      positions.set(node.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    });

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(86, 93, 103, 0.22)";
    for (const link of sub.links) {
      const a = positions.get(text(link.source));
      const b = positions.get(text(link.target));
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const node of others) {
      const p = positions.get(node.id);
      const size = Math.max(3, Math.min(10, 3 + Math.sqrt(node.degree)));
      ctx.fillStyle = colorFor(node.community);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = positions.get(selectedId);
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#202124";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(center.label || center.id, cx, Math.max(18, cy - 22));

    ctx.fillStyle = "#686c73";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`${sub.nodes.length} nodes shown · ${sub.links.length} links considered`, cx, cy + 30);
  }

  function drawEmpty(message) {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#686c73";
    ctx.font = "15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(message, rect.width / 2, rect.height / 2);
  }

  function colorFor(value) {
    const n = Number(value || 0);
    const hue = (n * 47) % 360;
    return `hsl(${hue} 58% 43%)`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function main() {
    try {
      const response = await fetch(graphUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      graph = await response.json();
      buildIndexes(graph);
      statusEl.textContent = `${graph.nodes.length.toLocaleString()} nodes · ${graph.links.length.toLocaleString()} links`;
      renderResults();
      if (activeResults[0]) selectNode(activeResults[0].id);
    } catch (error) {
      statusEl.textContent = `Unable to load graph: ${error.message}`;
      detailsEl.textContent = "Run ./scripts/serve.sh from the repo root, then open /viewer/.";
    }
  }

  searchEl.addEventListener("input", renderResults);
  depthEl.addEventListener("change", drawNeighborhood);
  limitEl.addEventListener("change", drawNeighborhood);
  window.addEventListener("resize", resize);
  resize();
  main();
})();
