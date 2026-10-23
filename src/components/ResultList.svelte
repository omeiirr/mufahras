<script lang="ts">
  import BookMarked from '@lucide/svelte/icons/book-marked';
  import Tag from '@lucide/svelte/icons/tag';
  import type { PresentedHit, SearchResponse } from '../lib/search/types';
  import GradeBadge from './GradeBadge.svelte';
  import Highlighted from './Highlighted.svelte';

  let {
    response,
    selectedKey,
    onopen,
    onmore,
    onsuggest,
    hrefFor,
  }: {
    response: SearchResponse;
    selectedKey: string | null;
    onopen: (hit: PresentedHit) => void;
    onmore: () => void;
    onsuggest: (patch: { corpus?: 'all'; sahih?: false; q?: string }) => void;
    hrefFor: (path: string) => string;
  } = $props();

  const items = $derived([...response.pinned.map((h) => ({ hit: h, pinned: true })), ...response.hits.map((h) => ({ hit: h, pinned: false }))]);
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
    {response.total.toLocaleString()} {response.total === 1 ? 'result' : 'results'}{response.partial ? ' so far, still loading hadith…' : ''}
  {:else if !response.pinned.length}
    No results{response.partial ? ' yet, still loading hadith…' : ''}
  {/if}
</p>

{#if response.chips.length}
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

{#if !response.total && !response.pinned.length && !response.partial}
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

<ol class="list">
  {#each items as { hit, pinned } (`${pinned ? 'p' : 'h'}${hit.key}`)}
    {#if !pinned && hit === response.hits[firstNear]}
      <li class="divider" aria-hidden="true">
        <span>Close matches</span>
        <span class="why">most of your words, maybe worded differently</span>
      </li>
    {/if}
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
    font-size: 1.5rem;
    line-height: 2;
  }
  .text.arabic {
    font-size: 1.2rem;
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
</style>
