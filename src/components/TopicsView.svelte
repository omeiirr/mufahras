<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import type { TopicsDetail } from '../lib/data/views';

  let { d, hrefFor }: { d: TopicsDetail; hrefFor: (path: string) => string } = $props();

  let filter = $state('');
  let open = $state<number | null>(null);
  const shown = $derived.by(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return d.topics;
    return d.topics.filter((t) => t.name.toLowerCase().includes(f) || t.children.some((c) => c.name.toLowerCase().includes(f)));
  });
</script>

<section class="page">
  <h1>Topics</h1>
  <p class="sub">{d.topics.length} topics in the Quran, from the Quranic Universal Library.</p>
  <label class="visually-hidden" for="topic-filter">Filter topics</label>
  <input id="topic-filter" class="filter" bind:value={filter} placeholder="Filter topics" autocomplete="off" />
  <ul class="list">
    {#each shown as t (t.id)}
      <li>
        <div class="row">
          <a href={hrefFor(`topic/${t.id}`)}><span class="name">{t.name}</span> <span class="n">{t.count}</span></a>
          {#if t.children.length}
            <button type="button" class="more" aria-expanded={open === t.id} aria-label={`Subtopics of ${t.name}`} onclick={() => (open = open === t.id ? null : t.id)}>
              {t.children.length} <ChevronDown size={16} aria-hidden="true" />
            </button>
          {/if}
        </div>
        {#if open === t.id || (filter && t.children.some((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase())))}
          <ul class="children">
            {#each t.children as c (c.id)}<li><a href={hrefFor(`topic/${c.id}`)}>{c.name} <span class="n">{c.count}</span></a></li>{/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
  {#if !shown.length}<p class="sub">No topic matches “{filter}”.</p>{/if}
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
  .filter {
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
  }
  .list,
  .children {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .list > li {
    border-bottom: 1px solid var(--line);
  }
  .row {
    display: flex;
    align-items: center;
  }
  .row a {
    flex: 1;
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--tap);
    align-items: center;
    padding: 0 var(--space-2);
    color: inherit;
    text-decoration: none;
    border-radius: var(--radius-sm);
  }
  .row a:hover,
  .children a:hover {
    background: var(--surface-2);
  }
  .name {
    font-weight: 500;
  }
  .n {
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .more[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
  }
  .children {
    padding: 0 0 var(--space-2) var(--space-4);
  }
  .children a {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 36px;
    align-items: center;
    padding: 0 var(--space-2);
    color: inherit;
    text-decoration: none;
    font-size: var(--text-sm);
    border-radius: var(--radius-sm);
  }
</style>
