<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { SvelteSet } from 'svelte/reactivity';
  import type { TopicNode } from '../lib/data/views';
  import { treeKeys } from '../lib/ui/focus';

  let {
    nodes,
    hrefFor,
    expanded = new Set<number>(),
    label = 'Topics',
  }: {
    nodes: TopicNode[];
    hrefFor: (path: string) => string;
    /** Opened from outside, such as the headings above a filter match. */
    expanded?: Set<number>;
    label?: string;
  } = $props();

  // Each branch is opened by its path, so a topic under two parents opens on its own in each place.
  const opened = new SvelteSet<string>();
  const isOpen = (key: string, id: number) => opened.has(key) !== expanded.has(id);
  const toggle = (key: string) => (opened.has(key) ? opened.delete(key) : opened.add(key));
</script>

{#snippet branch(list: TopicNode[], parentKey: string)}
  {#each list as t (t.id)}
    {@const key = `${parentKey}/${t.id}`}
    {@const open = isOpen(key, t.id)}
    <li>
      <div class="row">
        {#if t.children.length}
          <button type="button" class="toggle" aria-expanded={open} aria-label={`Subtopics of ${t.name}`} onclick={() => toggle(key)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        {:else}
          <span class="toggle" aria-hidden="true"></span>
        {/if}
        <a href={hrefFor(`topic/${t.id}`)}>
          <span class="name">{t.name}</span>
          <span class="n">{t.count}</span>
        </a>
      </div>
      {#if open}
        <ul class="children">{@render branch(t.children, key)}</ul>
      {/if}
    </li>
  {/each}
{/snippet}

<ul class="tree" aria-label={label} use:treeKeys>{@render branch(nodes, '')}</ul>

<style>
  .tree,
  .children {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tree > li {
    border-bottom: 1px solid var(--line);
  }
  .children {
    margin-left: calc(var(--tap) / 2 - 1px);
    padding-left: var(--space-2);
    border-left: 1px solid var(--line);
  }
  .row {
    display: flex;
    align-items: center;
  }
  .toggle {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--tap);
    min-height: var(--tap);
    color: var(--ink-2);
  }
  .toggle[aria-expanded='true'] :global(svg) {
    transform: rotate(90deg);
  }
  a {
    flex: 1;
    min-width: 0;
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
  a:hover {
    background: var(--surface-2);
  }
  .children a {
    min-height: 40px;
    font-size: var(--text-sm);
  }
  .tree > li > .row .name {
    font-weight: 500;
  }
  .n {
    flex: none;
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }
</style>
