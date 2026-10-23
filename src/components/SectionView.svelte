<script lang="ts">
  import BookMarked from '@lucide/svelte/icons/book-marked';
  import type { SectionDetail } from '../lib/data/views';
  import GradeBadge from './GradeBadge.svelte';

  let { d, hrefFor }: { d: SectionDetail; hrefFor: (path: string) => string } = $props();
</script>

<article class="section">
  <header>
    <p class="kind"><BookMarked size={16} aria-hidden="true" /> {d.title} · Book {d.n}</p>
    <h1>{d.name}</h1>
    <p class="count">{d.hadiths.length} hadith</p>
  </header>
  <ol class="list">
    {#each d.hadiths as h (h.number)}
      <li>
        <a href={hrefFor(`${d.book}/${h.number}`)}>
          <span class="ref">{d.short} {h.number} {#if !['bukhari', 'muslim'].includes(d.book)}<GradeBadge grade={h.grade} />{/if}</span>
          <span class="en">{h.en}</span>
        </a>
      </li>
    {/each}
  </ol>
</article>

<style>
  .section {
    display: grid;
    gap: var(--space-4);
  }
  .kind {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .count {
    margin: var(--space-1) 0 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list a {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
  }
  .list a:hover {
    background: var(--surface-2);
  }
  .ref {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .en {
    line-height: 1.6;
  }
</style>
