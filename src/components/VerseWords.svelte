<script lang="ts" module>
  // One word card open per page: opening a word in another verse closes the previous one.
  const open = $state<{ key: string | null }>({ key: null });
</script>

<script lang="ts">
  // A verse's Arabic with every word tappable for word by word (WordCard below it). Used on the verse
  // screen, the surah screen and the lists of verses; a word's data loads on the first tap.
  import type { SearchClient } from '../lib/search/client';
  import type { WordsDetail } from '../lib/data/views';
  import { wordSpans } from '../lib/text/quran-display';
  import { ayahMarker } from '../lib/ui/format';
  import WordCard from './WordCard.svelte';

  let {
    ar,
    surah,
    ayah,
    client,
    hint = false,
    class: cls = '',
  }: {
    ar: string;
    surah: number;
    ayah: number;
    client: SearchClient;
    /** Show "Tap any word…" until the first tap anywhere (the verse screen). */
    hint?: boolean;
    class?: string;
  } = $props();

  const key = $derived(`${surah}:${ayah}`);
  const spans = $derived(wordSpans(ar));
  let picked = $state<number | null>(null);
  let words = $state<WordsDetail['words'] | null>(null);
  const shown = $derived(open.key === key ? picked : null);

  const HINT_KEY = 'wbw-hint-seen';
  let hintShown = $state(
    (() => {
      if (!hint) return false;
      try {
        return !localStorage.getItem(HINT_KEY);
      } catch {
        return true;
      }
    })(),
  );

  // Reset when the verse changes. Not on every new `ar`: the verse screen gets the same verse again with
  // its extras a moment after it opens, and that must not clear a word just tapped.
  let shownRef = '';
  $effect(() => {
    if (key === shownRef) return;
    shownRef = key;
    picked = null;
    words = null;
  });

  function pick(k: number) {
    if (k < 0 || k >= spans.length) return;
    picked = k;
    open.key = key;
    if (hintShown) {
      hintShown = false;
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        // storage blocked: the hint shows again next time
      }
    }
    if (!words)
      client.detail({ kind: 'words', surah, ayah }).then((r) => {
        if (r?.kind === 'words') words = r.words;
      });
  }

  function close() {
    picked = null;
    if (open.key === key) open.key = null;
  }
</script>

<p class="quran {cls}" lang="ar" dir="rtl">
  {#each spans as [a, b], k (k)}
    {#if k === spans.length - 1}
      <span class="nowrap"
        ><button type="button" class="w" class:sel={shown === k} onclick={() => pick(k)}>{ar.slice(a, b)}</button>
        <span class="marker">{ayahMarker(ayah)}</span></span
      >
    {:else}
      <button type="button" class="w" class:sel={shown === k} onclick={() => pick(k)}>{ar.slice(a, b)}</button>{' '}
    {/if}
  {/each}
</p>
{#if shown !== null}
  <WordCard {words} index={shown} onpick={pick} onclose={close} />
{:else if hintShown}
  <p class="hint">Tap any word to see it word by word.</p>
{/if}

<style>
  .nowrap {
    white-space: nowrap;
  }
  .marker {
    color: var(--accent);
  }
  /* Words are buttons, but read as plain text until tapped. */
  .w {
    font: inherit;
    color: inherit;
    padding: 0 1px;
    border-radius: 6px;
    cursor: pointer;
  }
  /* Touch screens keep :hover after a tap; only real pointers get the hover tint. */
  @media (hover: hover) {
    .w:hover {
      background: var(--surface-2);
    }
  }
  .w.sel {
    background: color-mix(in srgb, var(--mark) 70%, transparent);
  }
  .hint {
    margin: calc(-1 * var(--space-2)) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
