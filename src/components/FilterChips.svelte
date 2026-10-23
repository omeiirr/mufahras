<script lang="ts">
  import type { Corpus } from '../lib/router.svelte';

  let { corpus, sahih, onchange }: { corpus: Corpus; sahih: boolean; onchange: (patch: { corpus?: Corpus; sahih?: boolean }) => void } = $props();

  const options: [Corpus, string][] = [
    ['all', 'All'],
    ['quran', 'Quran'],
    ['hadith', 'Hadith'],
  ];
</script>

<div class="chips">
  <div class="group" role="radiogroup" aria-label="Search in">
    {#each options as [value, label] (value)}
      <button type="button" role="radio" aria-checked={corpus === value} class:on={corpus === value} onclick={() => onchange({ corpus: value })}>{label}</button>
    {/each}
  </div>
  <button type="button" class="toggle" class:on={sahih} aria-pressed={sahih} disabled={corpus === 'quran'} onclick={() => onchange({ sahih: !sahih })}>
    Sahih hadith only
  </button>
</div>

<style>
  .chips {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .group {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--surface-2);
    border-radius: 99px;
  }
  button {
    min-height: 36px;
    padding: 0 var(--space-3);
    border-radius: 99px;
    font-size: var(--text-sm);
    color: var(--ink-2);
    white-space: nowrap;
    transition:
      background var(--dur) var(--ease),
      color var(--dur) var(--ease);
    position: relative;
  }
  /* Keep a 44px touch target around the 36px visual chip. */
  button::after {
    content: '';
    position: absolute;
    inset: -4px 0;
  }
  .group button.on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
  .toggle {
    border: 1px solid var(--line);
  }
  .toggle.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .toggle:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
