<script lang="ts">
  import type { Corpus } from '../lib/router.svelte';
  import { radiogroup } from '../lib/ui/focus';

  let { corpus, sahih, onchange }: { corpus: Corpus; sahih: boolean; onchange: (patch: { corpus?: Corpus; sahih?: boolean }) => void } = $props();

  const options: [Corpus, string][] = [
    ['all', 'All'],
    ['quran', 'Quran'],
    ['hadith', 'Hadith'],
  ];
</script>

<div class="chips">
  <div class="group" role="radiogroup" use:radiogroup aria-label="Search in">
    {#each options as [value, label] (value)}
      <button type="button" role="radio" aria-checked={corpus === value} class:on={corpus === value} onclick={() => onchange({ corpus: value })}>{label}</button>
    {/each}
  </div>
  <button
    type="button"
    class="toggle"
    class:on={sahih}
    aria-pressed={sahih}
    aria-label="Sahih hadith only"
    disabled={corpus === 'quran'}
    onclick={() => onchange({ sahih: !sahih })}
  >
    Sahih only
  </button>
</div>

<style>
  /* Not a scroll container: a row that scrolled sideways also dragged vertically by the enlarged tap
     areas. It fits at common phone widths and wraps on very narrow ones. */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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
    padding: 0 10px;
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
