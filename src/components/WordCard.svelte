<script lang="ts">
  // Word by word under a verse: the tapped word, its transliteration and meaning, and stepping through
  // the ayah. Next goes to the following word, which in Arabic is to the left; the buttons are laid out to match.
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import X from '@lucide/svelte/icons/x';
  import type { WordsDetail } from '../lib/data/views';

  let { words, index, onpick, onclose }: { words: WordsDetail['words'] | null; index: number; onpick: (k: number) => void; onclose: () => void } = $props();

  const w = $derived(words?.[index]);
  const hasMeanings = $derived(!!words?.some((x) => x.meaning));
</script>

<div class="card" role="region" aria-label="Word by word" aria-live="polite">
  {#if !words}
    <p class="sub">Loading…</p>
  {:else if w}
    <div class="body">
      <p class="ar" lang="ar" dir="rtl">{w.ar}</p>
      <div class="info">
        <p class="translit">{w.translit || '—'}</p>
        {#if w.meaning}<p class="meaning">{w.meaning}</p>{:else if !hasMeanings}<p class="sub">Transliteration only; meanings aren't available.</p>{/if}
      </div>
    </div>
    <!-- Laid out right to left like the verse: the next word is to the left, so Next is on the left and
         points left, Previous on the right and points right. -->
    <div class="nav">
      <button type="button" onclick={() => onpick(index + 1)} disabled={index === words.length - 1} aria-label="Next word"><ChevronLeft size={18} aria-hidden="true" /> Next</button>
      <span class="sub">Word {index + 1} of {words.length}</span>
      <button type="button" onclick={() => onpick(index - 1)} disabled={index === 0} aria-label="Previous word">Previous <ChevronRight size={18} aria-hidden="true" /></button>
      <button type="button" class="x" onclick={onclose} aria-label="Close word by word"><X size={18} aria-hidden="true" /></button>
    </div>
  {/if}
</div>

<style>
  .card {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .body {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .ar {
    margin: 0;
    font-family: var(--font-quran);
    font-size: calc(2.2rem * var(--arabic-scale, 1));
    line-height: 1.8;
  }
  .info {
    display: grid;
    gap: 2px;
  }
  .info p {
    margin: 0;
  }
  .translit {
    font-style: italic;
    font-size: var(--text-lg);
  }
  .meaning {
    font-weight: 600;
  }
  .sub {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .nav .sub {
    flex: 1;
    text-align: center;
  }
  .nav button {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-weight: 600;
    font-size: var(--text-sm);
  }
  .nav button:disabled {
    color: var(--ink-2);
    opacity: 0.5;
  }
  .nav .x {
    color: var(--ink-2);
  }
</style>
