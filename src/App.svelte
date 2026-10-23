<script lang="ts">
  // Bare search page for trying the engine (milestone 2). The real interface comes in milestone 3.
  import { SearchClient } from './lib/search/client';
  import type { PresentedHit, SearchOptions, SearchResponse } from './lib/search/types';
  import type { LoadStatus } from './lib/search/worker';

  let query = $state('');
  let corpus = $state<NonNullable<SearchOptions['corpus']>>('all');
  let sahihOnly = $state(false);
  let response = $state<SearchResponse | null>(null);
  let status = $state<LoadStatus>({ loaded: [], ready: false });

  const client = new SearchClient(
    new URL('data/', document.baseURI).href,
    (r) => (response = r),
    (s) => (status = s),
  );

  $effect(() => {
    client.search(query, { corpus, minGrade: sahihOnly ? 'sahih' : undefined });
  });

  /** Splits text into [part, highlighted] pieces for rendering. */
  function parts(hit: PresentedHit): [string, boolean][] {
    const out: [string, boolean][] = [];
    let at = 0;
    for (const [s, e] of hit.ranges) {
      if (s > at) out.push([hit.text.slice(at, s), false]);
      out.push([hit.text.slice(s, e), true]);
      at = e;
    }
    if (at < hit.text.length) out.push([hit.text.slice(at), false]);
    return out;
  }

  const tierNote: Record<number, string> = { 2: 'typo match', 1: 'abbreviation match' };
</script>

<main>
  <h1>Quran & Hadith Search <small>preview</small></h1>

  <!-- svelte-ignore a11y_autofocus -->
  <input class="q" type="search" bind:value={query} placeholder="patience prayer · 2:255 · baqarah 255 · bukhari 1 · الحمد لله" autofocus autocomplete="off" spellcheck="false" />

  <div class="controls">
    <label><input type="radio" bind:group={corpus} value="all" /> All</label>
    <label><input type="radio" bind:group={corpus} value="quran" /> Quran</label>
    <label><input type="radio" bind:group={corpus} value="hadith" /> Hadith</label>
    <label><input type="checkbox" bind:checked={sahihOnly} /> Sahih hadith only</label>
  </div>

  <p class="status">
    {#if status.error}
      Error: {status.error}
    {:else if !status.loaded.includes('quran')}
      Loading Quran…
    {:else}
      Quran ready in {status.quranMs} ms ·
      {status.ready ? 'all books loaded' : `loading hadith (${status.loaded.filter((n) => n.startsWith('hadith-') && !n.endsWith('-ar')).length}/6)…`}
      {#if status.loaded.some((n) => n.endsWith('-ar'))}· Arabic hadith {status.loaded.filter((n) => n.endsWith('-ar')).length}/6{/if}
      {#if response && query.trim()}
        · {response.total.toLocaleString()} results in {response.ms.toFixed(1)} ms{response.partial ? ' (still loading)' : ''}
      {/if}
    {/if}
  </p>

  {#if response}
    <ol>
      {#each [...response.pinned, ...response.hits] as hit, i (`${i < response.pinned.length ? 'pin' : 'hit'}-${hit.key}`)}
        <li class:pinned={i < response.pinned.length}>
          <div class="meta">
            <strong>{hit.label}</strong>
            <span>{hit.sublabel}</span>
            {#if hit.grade && hit.ref.kind === 'hadith'}<span class="grade {hit.grade}">{hit.grade}</span>{/if}
            {#if tierNote[hit.tier]}<span class="tier">{tierNote[hit.tier]}</span>{/if}
            {#if i < response.pinned.length}<span class="tier">go to</span>{/if}
          </div>
          <p class:ar={hit.field === 'ar'} dir={hit.field === 'ar' ? 'rtl' : 'auto'}>
            {#each parts(hit) as [text, marked], k (k)}{#if marked}<mark>{text}</mark>{:else}{text}{/if}{/each}
          </p>
          {#if hit.secondary}<p class="secondary">{hit.secondary}</p>{/if}
        </li>
      {/each}
    </ol>
  {/if}
</main>

<style>
  :global(:root) {
    --bg: #fbfaf7;
    --fg: #1d1d1b;
    --muted: #6b6a66;
    --line: #e4e1da;
    --accent: #2f6f62;
    --mark: #f6e3a1;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg: #151614;
      --fg: #e9e7e1;
      --muted: #9c9a93;
      --line: #2c2d2a;
      --accent: #7fc3b2;
      --mark: #5a4a12;
    }
  }
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font: 16px/1.5 system-ui, sans-serif;
  }
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 16px;
  }
  h1 {
    font-size: 1.25rem;
    margin: 0.5rem 0 1rem;
  }
  h1 small {
    color: var(--muted);
    font-weight: normal;
    font-size: 0.8rem;
  }
  .q {
    width: 100%;
    box-sizing: border-box;
    font-size: 1.1rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: transparent;
    color: inherit;
  }
  .q:focus {
    outline: 2px solid var(--accent);
    border-color: transparent;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0.6rem 0;
    font-size: 0.9rem;
  }
  .status {
    color: var(--muted);
    font-size: 0.8rem;
    margin: 0 0 0.5rem;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    border-top: 1px solid var(--line);
    padding: 0.7rem 0;
  }
  li.pinned {
    border-left: 3px solid var(--accent);
    padding-left: 0.7rem;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: baseline;
    font-size: 0.85rem;
  }
  .meta strong {
    color: var(--accent);
  }
  .meta span {
    color: var(--muted);
  }
  .tier,
  .grade {
    font-size: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 99px;
    padding: 0 0.45rem;
  }
  .grade.sahih {
    color: #2e7d32;
  }
  .grade.hasan {
    color: #8a6d00;
  }
  .grade.daif,
  .grade.mawdu {
    color: #b3261e;
  }
  p {
    margin: 0.25rem 0 0;
    overflow-wrap: anywhere;
  }
  .ar {
    font-family: 'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', serif;
    font-size: 1.35rem;
    line-height: 2;
  }
  .secondary {
    color: var(--muted);
    font-size: 0.9rem;
  }
  mark {
    background: var(--mark);
    color: inherit;
    border-radius: 3px;
  }
</style>
