<script lang="ts">
  import type { TopicNode, TopicsDetail } from '../lib/data/views';
  import TopicTree from './TopicTree.svelte';

  let { d, hrefFor }: { d: TopicsDetail; hrefFor: (path: string) => string } = $props();

  let filter = $state('');
  /** With a filter: the topics that match, with the headings above them opened down to each match. */
  const shown = $derived.by(() => {
    const f = filter.trim().toLowerCase();
    const expanded = new Set<number>();
    if (!f) return { nodes: d.topics, expanded };
    const prune = (list: TopicNode[]): TopicNode[] =>
      list.flatMap((t) => {
        if (t.name.toLowerCase().includes(f)) return [t];
        const children = prune(t.children);
        if (!children.length) return [];
        expanded.add(t.id);
        return [{ ...t, children }];
      });
    return { nodes: prune(d.topics), expanded };
  });
</script>

<section class="page">
  <h1>Topics</h1>
  <p class="sub">{d.topics.length} topics in the Quran, from the Quranic Universal Library. Open one to see the topics under it.</p>
  <label class="visually-hidden" for="topic-filter">Filter topics</label>
  <input id="topic-filter" class="filter" bind:value={filter} placeholder="Filter topics" autocomplete="off" />
  {#key shown}
    <TopicTree nodes={shown.nodes} expanded={shown.expanded} {hrefFor} />
  {/key}
  {#if !shown.nodes.length}<p class="sub">No topic matches “{filter}”.</p>{/if}
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
</style>
