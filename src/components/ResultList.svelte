<script lang="ts" module>
  /** Results by meaning shown before "More by meaning". */
  export const MEANING_FIRST = 5;
</script>

<script lang="ts">
  import BookMarked from '@lucide/svelte/icons/book-marked';
  import Tag from '@lucide/svelte/icons/tag';
  import type { MeaningStatus } from '../lib/meaning/meaning-worker';
  import type { PresentedHit, SearchResponse } from '../lib/search/types';
  import { settings } from '../lib/store/settings.svelte';
  import GradeBadge from './GradeBadge.svelte';
  import Highlighted from './Highlighted.svelte';

  let {
    response,
    selectedKey,
    onopen,
    onmore,
    onsuggest,
    hrefFor,
    meaning = null,
    meaningOpen = $bindable(false),
  }: {
    response: SearchResponse;
    /** Search by meaning for this query: its results (null while pending) and the model's status. */
    meaning?: { hits: PresentedHit[] | null; status: MeaningStatus } | null;
    /** All results by meaning shown, not just the first MEANING_FIRST. */
    meaningOpen?: boolean;
    selectedKey: string | null;
    onopen: (hit: PresentedHit) => void;
    onmore: () => void;
    onsuggest: (patch: { corpus?: 'all'; sahih?: false; q?: string }) => void;
    hrefFor: (path: string) => string;
  } = $props();

  const meaningHits = $derived(meaning?.hits ? meaning.hits.slice(0, meaningOpen ? undefined : MEANING_FIRST) : []);
  const mb = (n: number) => `${Math.round(n / 1e6)} MB`;
  const more = $derived(response.hits.length < response.total);
  // Source-finder matches come after all strict matches; a divider introduces them.
  const firstNear = $derived(response.hits.findIndex((h) => h.overlap));
  const tierNote: Record<number, string> = { 2: 'close spelling', 1: 'abbreviation' };

  let sentinel = $state<HTMLElement>();
  $effect(() => {
    if (!sentinel || !more) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onmore(), { rootMargin: '400px' });
    io.observe(sentinel);
    return () => io.disconnect();
  });

  /** Scroll the keyboard-selected result into view. */
  $effect(() => {
    if (!selectedKey) return;
    document.getElementById(`hit-${selectedKey}`)?.scrollIntoView({ block: 'nearest' });
  });
</script>

<p class="summary" aria-live="polite">
  {#if response.total}
    {response.total.toLocaleString()} {response.total === 1 ? 'result' : 'results'}{meaning ? ' with your words' : ''}{response.partial ? ' so far, still loading hadith…' : ''}
  {:else if meaning?.hits?.length}
    No texts with your words{response.partial ? ' yet, still loading hadith…' : ''}
  {:else if !response.pinned.length}
    No results{response.partial ? ' yet, still loading hadith…' : ''}
  {/if}
</p>

{#if response.chips.length && !settings.sakinah}
  <ul class="chips" aria-label="Browse">
    {#each response.chips as chip (chip.path)}
      <li>
        <a href={hrefFor(chip.path)} class="chip" title={chip.label}>
          {#if chip.kind === 'topic'}<Tag size={16} aria-hidden="true" />{:else}<BookMarked size={16} aria-hidden="true" />{/if}
          <span class="label">{chip.label}</span>
          <span class="sub">{chip.sub}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

{#if !response.total && !response.pinned.length && !response.partial && !meaning?.hits?.length}
  <div class="none">
    <p>Nothing matched <strong dir="auto">“{response.query}”</strong>.</p>
    <ul>
      {#if response.query.trim().split(/\s+/).length > 2}
        <li>Try fewer words; every word has to appear in the text.</li>
      {/if}
      <li>Translations word things differently. Try a key word or two instead of a whole sentence.</li>
      <li>
        <button type="button" onclick={() => onsuggest({ corpus: 'all', sahih: false })}>Search everything</button>
        in case a filter is hiding results.
      </li>
    </ul>
  </div>
{/if}

{#snippet item(hit: PresentedHit, pinned: boolean)}
  <li id={pinned ? undefined : `hit-${hit.key}`}>
    <a
      href={hrefFor(hit.path)}
      class="hit"
      class:pinned
      class:selected={selectedKey === hit.key}
      aria-current={selectedKey === hit.key ? 'true' : undefined}
      onclick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onopen(hit);
      }}
    >
      <span class="meta">
        {#if pinned}<span class="go">Go to</span>{/if}
        <strong>{hit.label}</strong>
        <span class="sub">{hit.sublabel}</span>
        {#if hit.grade && hit.ref.kind === 'hadith'}<GradeBadge grade={hit.grade} />{/if}
        {#if hit.overlap}<span class="tier">{hit.overlap[0]} of {hit.overlap[1]} words</span>
        {:else if tierNote[hit.tier]}<span class="tier">{tierNote[hit.tier]}</span>{/if}
      </span>
      {#if hit.field === 'ar'}
        <span class={hit.ref.kind === 'ayah' ? 'quran text' : 'arabic text'} lang="ar" dir="rtl"><Highlighted text={hit.text} ranges={hit.ranges} /></span>
      {:else}
        <span class="text" class:translit={hit.field === 'translit'}><Highlighted text={hit.text} ranges={hit.ranges} /></span>
      {/if}
      {#if hit.secondary}<span class="secondary">{hit.secondary}</span>{/if}
    </a>
  </li>
{/snippet}

<ol class="list">
  {#each response.pinned as hit (`p${hit.key}`)}
    {@render item(hit, true)}
  {/each}

  {#if meaning}
    <li class="divider meaning" aria-hidden="true">
      <span>By meaning</span>
      <span class="why">may not contain your words</span>
    </li>
    {#each meaningHits as hit (hit.key)}
      {@render item(hit, false)}
    {/each}
    {#if !meaning.hits}
      <li class="pending" role="status">
        {#if meaning.status.state === 'downloading'}
          Downloading search by meaning: {mb(meaning.status.loaded)} of {mb(meaning.status.total)}…
        {:else if meaning.status.state === 'error'}
          Search by meaning couldn't load: {meaning.status.error}
        {:else if meaning.status.state === 'ready'}
          Searching by meaning…
        {:else}
          Preparing search by meaning…
        {/if}
      </li>
    {:else if !meaning.hits.length}
      <li class="pending">Nothing close in meaning with these filters.</li>
    {:else if meaning.hits.length > MEANING_FIRST}
      <li>
        <button type="button" class="more" aria-expanded={meaningOpen} onclick={() => (meaningOpen = !meaningOpen)}>
          {meaningOpen ? 'Fewer by meaning' : `More by meaning (${meaning.hits.length - MEANING_FIRST})`}
        </button>
      </li>
    {/if}
    {#if response.hits.length}
      <li class="divider" aria-hidden="true"><span>With your words</span></li>
    {/if}
  {/if}

  {#each response.hits as hit, k (`h${hit.key}`)}
    {#if k === firstNear}
      <li class="divider" aria-hidden="true">
        <span>Close matches</span>
        <span class="why">most of your words, maybe worded differently</span>
      </li>
    {/if}
    {@render item(hit, false)}
  {/each}
</ol>
{#if more}<div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>{/if}

<style>
  .summary {
    margin: 0;
    padding: var(--space-3) var(--space-4) var(--space-1);
    font-size: var(--text-sm);
    color: var(--ink-2);
    min-height: 1.5em;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0 var(--space-2);
  }
  .hit {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
    padding: var(--space-3);
    border-radius: var(--radius);
    color: inherit;
    text-decoration: none;
    transition: background var(--dur) var(--ease);
  }
  .hit:hover {
    background: var(--surface-2);
  }
  .hit.selected {
    background: var(--accent-soft);
  }
  .hit.pinned {
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    margin-bottom: var(--space-2);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
  }
  .meta strong {
    color: var(--accent);
  }
  .sub {
    color: var(--ink-2);
  }
  .go {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
  }
  .tier {
    font-size: var(--text-xs);
    color: var(--ink-2);
    font-style: italic;
  }
  .text {
    overflow-wrap: anywhere;
  }
  .text:not(.quran):not(.arabic) {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .text.quran {
    font-size: calc(1.5rem * var(--arabic-scale, 1));
    line-height: 2;
  }
  .text.arabic {
    font-size: calc(1.2rem * var(--arabic-scale, 1));
  }
  .translit {
    font-style: italic;
  }
  .secondary {
    color: var(--ink-2);
    font-size: var(--text-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: var(--space-2) var(--space-4) 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border-radius: 99px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
    font-size: var(--text-sm);
  }
  .chip:hover {
    border-color: var(--accent);
  }
  .chip :global(svg) {
    color: var(--accent);
    flex: none;
  }
  .chip .label {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 22ch;
  }
  .chip .sub {
    color: var(--ink-2);
    white-space: nowrap;
  }
  .divider {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
    margin: var(--space-3) var(--space-3) 0;
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink-2);
  }
  .divider .why {
    font-weight: 400;
  }
  .none {
    padding: 0 var(--space-4) var(--space-4);
    color: var(--ink-2);
    max-width: var(--measure);
  }
  .none ul {
    padding-left: 1.2em;
  }
  .none button {
    color: var(--accent);
    text-decoration: underline;
    min-height: var(--tap);
  }
  .sentinel {
    height: 1px;
  }
  .divider.meaning {
    margin-top: 0;
    border-top: 0;
  }
  .pending {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .more {
    min-height: var(--tap);
    padding: 0 var(--space-3);
    color: var(--accent);
    font-weight: 600;
    font-size: var(--text-sm);
  }
</style>
