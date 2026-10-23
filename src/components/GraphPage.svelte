<script lang="ts">
  // Similar verses as a graph: each node an ayah, each edge a pair QUL marks as sharing wording.
  // Positions come precomputed from the build (d3-force), so this page only draws: a canvas with
  // pan/zoom, a nearest-node hover tooltip, and a selected-node card that lists the same links as
  // text (so nothing here depends on colour or hovering). Loaded only when the page is opened.
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import type { GraphDetail, GraphNode } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';

  let {
    client,
    focus,
    onback,
    onopen,
    onfocus,
  }: {
    client: SearchClient;
    /** "2:255" to centre on that ayah, or null for the whole graph. */
    focus: string | null;
    onback: () => void;
    onopen: (path: string) => void;
    onfocus: (ref: string | null) => void;
  } = $props();

  let graph = $state<GraphDetail | null>(null);
  let canvas = $state<HTMLCanvasElement>();
  let box = $state<HTMLElement>();
  let size = $state({ w: 0, h: 0 });
  let view = $state({ k: 1, x: 0, y: 0 }); // screen = world * k + (x, y)
  let hovered = $state<number | null>(null);
  let pointer = $state({ x: 0, y: 0 });
  let goTo = $state('');
  let notFound = $state(false);

  $effect(() => {
    client.detail({ kind: 'graph' }).then((d) => {
      if (d?.kind === 'graph') graph = d;
    });
  });

  const keyOf = (n: GraphNode) => `${n.surah}:${n.ayah}`;
  const index = $derived(new Map(graph?.nodes.map((n, k) => [keyOf(n), k]) ?? []));
  const neighbours = $derived.by(() => {
    const m = new Map<number, [number, number][]>();
    for (const [a, b, s] of graph?.edges ?? []) {
      (m.get(a) ?? m.set(a, []).get(a)!).push([b, s]);
      (m.get(b) ?? m.set(b, []).get(b)!).push([a, s]);
    }
    return m;
  });
  const selected = $derived(focus ? (index.get(focus) ?? null) : null);
  const selectedLinks = $derived(selected === null ? [] : [...(neighbours.get(selected) ?? [])].sort((p, q) => q[1] - p[1]));

  // ---- view

  function fit() {
    if (!graph || !size.w) return;
    const xs = graph.nodes.map((n) => n.x);
    const ys = graph.nodes.map((n) => n.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min(size.w / (x1 - x0 + 40), size.h / (y1 - y0 + 40));
    view = { k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: size.h / 2 - ((y0 + y1) / 2) * k };
  }

  /** On phones the card covers the lower half, so the focused node sits in the space above it. */
  function centreOn(k: number, zoom = Math.max(view.k, 3)) {
    const n = graph!.nodes[k]!;
    const cy = size.w < 640 ? size.h * 0.24 : size.h / 2;
    view = { k: zoom, x: size.w / 2 - n.x * zoom, y: cy - n.y * zoom };
  }

  function zoomAt(factor: number, sx = size.w / 2, sy = size.h / 2) {
    const k = Math.min(40, Math.max(0.2, view.k * factor));
    const f = k / view.k;
    view = { k, x: sx - (sx - view.x) * f, y: sy - (sy - view.y) * f };
  }

  // Fit once the data and the canvas size are known; then follow focus changes.
  let fitted = false;
  $effect(() => {
    if (!graph || !size.w || fitted) return;
    fitted = true;
    if (selected !== null) centreOn(selected, 3);
    else fit();
  });
  let lastFocus: number | null = null;
  $effect(() => {
    if (!fitted || selected === lastFocus) return;
    lastFocus = selected;
    if (selected !== null) centreOn(selected);
  });

  $effect(() => {
    if (!box) return;
    const ro = new ResizeObserver(([e]) => (size = { w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(box);
    return () => ro.disconnect();
  });

  // ---- drawing

  let themeTick = $state(0);
  $effect(() => {
    const mo = new MutationObserver(() => themeTick++);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  });

  const radius = (n: GraphNode) => 1.6 + Math.sqrt(n.degree) * 0.9;

  $effect(() => {
    void themeTick;
    if (!canvas || !graph || !size.w) return;
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const ctx = canvas.getContext('2d')!;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const colour = { makkah: v('--viz-meccan'), madinah: v('--viz-medinan') };
    const { k, x: tx, y: ty } = view;
    const sx = (x: number) => x * k + tx;
    const sy = (y: number) => y * k + ty;
    const focusSet = selected === null ? null : new Set([selected, ...selectedLinks.map(([n]) => n)]);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = v('--bg');
    ctx.fillRect(0, 0, size.w, size.h);

    // Edges: recessive hairlines; the selected node's links in the accent.
    ctx.lineWidth = 1;
    ctx.strokeStyle = v('--line');
    ctx.globalAlpha = focusSet ? 0.35 : 1;
    ctx.beginPath();
    for (const [a, b] of graph.edges) {
      const p = graph.nodes[a]!;
      const q = graph.nodes[b]!;
      ctx.moveTo(sx(p.x), sy(p.y));
      ctx.lineTo(sx(q.x), sy(q.y));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (selected !== null) {
      const p = graph.nodes[selected]!;
      ctx.strokeStyle = v('--accent');
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [b] of selectedLinks) {
        const q = graph.nodes[b]!;
        ctx.moveTo(sx(p.x), sy(p.y));
        ctx.lineTo(sx(q.x), sy(q.y));
      }
      ctx.stroke();
    }

    // Nodes: a 1px background ring separates overlapping dots; at least 2.5px on screen.
    ctx.lineWidth = 1;
    ctx.strokeStyle = v('--bg');
    graph.nodes.forEach((n, i) => {
      const r = Math.max(2.5, radius(n) * Math.min(k, 6));
      ctx.globalAlpha = focusSet && !focusSet.has(i) ? 0.25 : 1;
      ctx.fillStyle = colour[n.place];
      ctx.beginPath();
      ctx.arc(sx(n.x), sy(n.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Labels in ink, never the series colour: the selection and its links always; everything when zoomed in.
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const label = (i: number, strong: boolean) => {
      const n = graph!.nodes[i]!;
      ctx.fillStyle = strong ? v('--ink') : v('--ink-2');
      ctx.fillText(keyOf(n), sx(n.x) + Math.max(2.5, radius(n) * Math.min(k, 6)) + 3, sy(n.y));
    };
    if (k > 3.5) graph.nodes.forEach((n, i) => (!focusSet || focusSet.has(i)) && label(i, false));
    if (focusSet) for (const i of focusSet) label(i, i === selected);
    if (hovered !== null) {
      const n = graph.nodes[hovered]!;
      ctx.strokeStyle = v('--ink');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx(n.x), sy(n.y), Math.max(2.5, radius(n) * Math.min(k, 6)) + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // ---- pointer: pan, pinch, wheel zoom, nearest-node hover and tap

  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch: { d: number; k: number } | null = null;

  function local(e: PointerEvent | WheelEvent) {
    const r = canvas!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Nearest node within 16px of a screen point (bigger than the dots, so they're easy to hit). */
  function nearest(p: { x: number; y: number }): number | null {
    if (!graph) return null;
    let best: number | null = null;
    let bestD = 16 * 16;
    graph.nodes.forEach((n, i) => {
      const d = (n.x * view.k + view.x - p.x) ** 2 + (n.y * view.k + view.y - p.y) ** 2;
      if (d < bestD) [best, bestD] = [i, d];
    });
    return best;
  }

  function down(e: PointerEvent) {
    canvas!.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), k: view.k };
    }
  }

  function move(e: PointerEvent) {
    const p = local(e);
    pointer = p;
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      hovered = e.pointerType === 'mouse' ? nearest(p) : null;
      return;
    }
    pointers.set(e.pointerId, p);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      zoomAt((pinch.k * (d / pinch.d)) / view.k, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      moved += 10;
      return;
    }
    moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
    view = { ...view, x: view.x + p.x - prev.x, y: view.y + p.y - prev.y };
    hovered = null;
  }

  function up(e: PointerEvent) {
    const p = local(e);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (moved < 6) {
      const hit = nearest(p);
      onfocus(hit === null ? null : keyOf(graph!.nodes[hit]!));
    }
  }

  function wheel(e: WheelEvent) {
    e.preventDefault();
    const p = local(e);
    zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
  }

  function submitGoTo(e: SubmitEvent) {
    e.preventDefault();
    const ref = goTo.trim().replace(/\s*[:.\s]\s*/, ':');
    notFound = !index.has(ref);
    if (!notFound) onfocus(ref);
  }

  const hoveredNode = $derived(hovered !== null && graph ? graph.nodes[hovered]! : null);
  const selectedNode = $derived(selected !== null && graph ? graph.nodes[selected]! : null);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === '+' || e.key === '=') zoomAt(1.4);
    else if (e.key === '-') zoomAt(1 / 1.4);
    else if (e.key === 'Escape') (selected !== null ? onfocus(null) : onback());
  }}
/>

<div class="graph-page">
  <header class="top">
    <button type="button" class="icon" onclick={onback} aria-label="Back"><ArrowLeft size={22} aria-hidden="true" /></button>
    <div class="titles">
      <h1>Similar verses</h1>
      {#if graph}<p class="meta">{graph.nodes.length.toLocaleString()} ayahs · {graph.edges.length.toLocaleString()} pairs with shared wording</p>{/if}
    </div>
    <form class="go" onsubmit={submitGoTo}>
      <label class="visually-hidden" for="graph-go">Find an ayah in the graph</label>
      <input id="graph-go" bind:value={goTo} placeholder="Find 2:255" inputmode="numeric" autocomplete="off" aria-invalid={notFound} />
    </form>
  </header>

  <div class="legend" aria-label="Legend">
    <span><i class="dot meccan"></i> Meccan</span>
    <span><i class="dot medinan"></i> Medinan</span>
    <span><i class="line"></i> similar wording</span>
    <span class="hint">Bigger dots have more similar verses. Tap a dot to see its links.</span>
    {#if notFound}<span class="warn" role="status">{goTo} has no similar verses in QUL's data.</span>{/if}
  </div>

  <div class="stage" bind:this={box}>
    <canvas
      bind:this={canvas}
      style:width={`${size.w}px`}
      style:height={`${size.h}px`}
      aria-hidden="true"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={(e) => pointers.delete(e.pointerId)}
      onpointerleave={() => (hovered = null)}
      onwheel={wheel}
      ondblclick={(e) => zoomAt(1.8, local(e as unknown as PointerEvent).x, local(e as unknown as PointerEvent).y)}
    ></canvas>
    <p class="visually-hidden">
      A graph of {graph?.nodes.length ?? 0} ayahs linked by shared wording. Use "Find" above to choose an ayah; its similar verses are then listed as
      links.
    </p>
    {#if !graph}<p class="loading">Loading the graph…</p>{/if}

    <div class="zoom">
      <button type="button" class="icon" onclick={() => zoomAt(1.4)} aria-label="Zoom in"><Plus size={20} aria-hidden="true" /></button>
      <button type="button" class="icon" onclick={() => zoomAt(1 / 1.4)} aria-label="Zoom out"><Minus size={20} aria-hidden="true" /></button>
      <button type="button" class="icon" onclick={fit} aria-label="Show the whole graph"><Maximize size={18} aria-hidden="true" /></button>
    </div>

    {#if hoveredNode && hovered !== selected}
      <div class="tip" style:left={`${Math.min(pointer.x + 14, size.w - 280)}px`} style:top={`${pointer.y + 14}px`} aria-hidden="true">
        <strong>{keyOf(hoveredNode)}</strong> <span class="sub">{hoveredNode.name} · {hoveredNode.degree} similar</span>
        <p>{hoveredNode.en}</p>
      </div>
    {/if}

    {#if selectedNode}
      <aside class="card" aria-label={`${keyOf(selectedNode)} and its similar verses`}>
        <div class="card-head">
          <div>
            <strong class="ref">{keyOf(selectedNode)}</strong>
            <span class="sub">{selectedNode.name} · {selectedNode.place === 'makkah' ? 'Meccan' : 'Medinan'}</span>
          </div>
          <button type="button" class="icon" onclick={() => onfocus(null)} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <p class="en">{selectedNode.en}</p>
        <button type="button" class="open" onclick={() => onopen(keyOf(selectedNode))}><BookOpen size={16} aria-hidden="true" /> Open verse</button>
        <p class="links-h">{selectedLinks.length} similar {selectedLinks.length === 1 ? 'verse' : 'verses'}</p>
        <ul class="links">
          {#each selectedLinks as [n, score] (n)}
            <li>
              <button type="button" onclick={() => onfocus(keyOf(graph!.nodes[n]!))}>
                <span class="ref">{keyOf(graph!.nodes[n]!)}</span>
                <span class="sub">{graph!.nodes[n]!.name}</span>
                <span class="score">{score}</span>
              </button>
            </li>
          {/each}
        </ul>
      </aside>
    {/if}
  </div>
</div>

<style>
  .graph-page {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }
  .top {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: calc(env(safe-area-inset-top) + var(--space-1)) var(--space-3) var(--space-1) var(--space-2);
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: var(--text-lg);
  }
  .meta {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
  .go input {
    width: 9rem;
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
  }
  .go input[aria-invalid='true'] {
    border-color: var(--daif);
  }
  .icon {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
    color: var(--ink);
  }
  .icon:hover {
    background: var(--surface-2);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-4);
    padding: 0 var(--space-4) var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink);
    border-bottom: 1px solid var(--line);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .dot.meccan {
    background: var(--viz-meccan);
  }
  .dot.medinan {
    background: var(--viz-medinan);
  }
  .line {
    width: 16px;
    height: 0;
    border-top: 2px solid var(--line);
  }
  .hint {
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
  .warn {
    color: var(--daif);
    font-size: var(--text-xs);
  }
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  canvas {
    display: block;
    touch-action: none;
    cursor: grab;
  }
  canvas:active {
    cursor: grabbing;
  }
  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--ink-2);
  }
  .zoom {
    position: absolute;
    right: var(--space-3);
    top: var(--space-3);
    display: grid;
    gap: var(--space-1);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .tip {
    position: absolute;
    width: 260px;
    pointer-events: none;
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
    font-size: var(--text-sm);
  }
  .tip p {
    margin: var(--space-1) 0 0;
    color: var(--ink-2);
  }
  .sub {
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .card {
    position: absolute;
    left: var(--space-3);
    bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
    width: min(360px, calc(100% - 2 * var(--space-3)));
    max-height: min(52%, 520px);
    overflow-y: auto;
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: var(--space-2);
  }
  .card .ref {
    color: var(--accent);
    margin-right: var(--space-2);
  }
  .en {
    margin: var(--space-2) 0;
    line-height: 1.55;
    font-size: var(--text-sm);
  }
  .open {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border-radius: 99px;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    font-size: var(--text-sm);
  }
  .links-h {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
    font-weight: 600;
  }
  .links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .links button {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    text-align: left;
  }
  .links button:hover {
    background: var(--surface-2);
  }
  .score {
    margin-left: auto;
    color: var(--ink-2);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
  }
</style>
