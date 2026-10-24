<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import type { PhrasesDetail } from '../lib/data/views';

  let { d, hrefFor }: { d: PhrasesDetail; hrefFor: (path: string) => string } = $props();

  let open = $state<number | null>(null);
  const PAGE = 60;
  let shown = $state(PAGE);
</script>

<section class="page">
  <h1>Repeated phrases</h1>
  <p class="sub">
    Phrases that recur across the Quran (mutashabihat), most repeated first: {d.phrases.length} of them. Useful for reflection, and for
    memorisers, since these are where recitation most often slips into another verse.
  </p>
  <ol class="list">
    {#each d.phrases.slice(0, shown) as p, k (k)}
      <li>
        <button type="button" aria-expanded={open === k} onclick={() => (open = open === k ? null : k)}>
          <span class="quran" lang="ar" dir="rtl">{p.text}</span>
          <span class="count">{p.count} ayahs <ChevronDown size={16} aria-hidden="true" /></span>
        </button>
        {#if open === k}
          <p class="refs">
            {#each p.refs as r (`${r.surah}:${r.ayah}`)}<a href={hrefFor(`${r.surah}:${r.ayah}`)} title={r.name}>{r.surah}:{r.ayah}</a>{/each}
            {#if p.count > p.refs.length}<span class="sub">and {p.count - p.refs.length} more</span>{/if}
          </p>
        {/if}
      </li>
    {/each}
  </ol>
  {#if shown < d.phrases.length}<button type="button" class="next" onclick={() => (shown += PAGE)}>Show more</button>{/if}
</section>

<style>
  .page {
    display: grid;
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .sub {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list > li {
    border-bottom: 1px solid var(--line);
  }
  .list button {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    text-align: left;
  }
  .list button:hover {
    background: var(--surface-2);
  }
  .quran {
    font-size: calc(1.35rem * var(--arabic-scale, 1));
    line-height: 2;
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  button[aria-expanded='true'] .count :global(svg) {
    transform: rotate(180deg);
  }
  .refs {
    margin: 0;
    padding: 0 var(--space-2) var(--space-3);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }
  .refs a {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-weight: 500;
  }
  .next {
    justify-self: center;
    min-height: var(--tap);
    padding: 0 var(--space-5);
    border: 1px solid var(--line);
    border-radius: 99px;
    color: var(--accent);
    font-weight: 600;
  }
</style>
