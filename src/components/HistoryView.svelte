<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import { clearHistory, history, removeSearch } from '../lib/store/history.svelte';

  let { onpick }: { onpick: (q: string) => void } = $props();

  const when = (t: number) => {
    const d = (Date.now() - t) / 1000;
    if (d < 3600) return `${Math.max(1, Math.round(d / 60))} min ago`;
    if (d < 86400) return `${Math.round(d / 3600)} h ago`;
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
</script>

<section class="page">
  <h1>Search history</h1>
  <p class="sub">Kept on this device only. Turn it off in the menu, under Privacy.</p>
  {#if history.list.length}
    <button type="button" class="clear" onclick={clearHistory}>Clear all</button>
    <ul class="list">
      {#each history.list as e (e.q)}
        <li>
          <button type="button" class="q" onclick={() => onpick(e.q)}><span dir="auto">{e.q}</span> <span class="sub">{when(e.at)}</span></button>
          <button type="button" class="x" onclick={() => removeSearch(e.q)} aria-label={`Remove ${e.q}`}><X size={16} aria-hidden="true" /></button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="sub">No searches yet.</p>
  {/if}
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
  .clear {
    justify-self: start;
    min-height: var(--tap);
    color: var(--accent);
    font-weight: 600;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list li {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--line);
  }
  .q {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--tap);
    padding: var(--space-2);
    text-align: left;
  }
  .q:hover {
    background: var(--surface-2);
  }
  .x {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    color: var(--ink-2);
  }
</style>
