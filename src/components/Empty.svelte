<script lang="ts">
  // Shown before typing: examples that demonstrate what the search understands.
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Network from '@lucide/svelte/icons/network';
  import type { SearchClient } from '../lib/search/client';
  import DailyVerse from './DailyVerse.svelte';
  import OfflinePanel from './OfflinePanel.svelte';

  let {
    onpick,
    onbrowse,
    client,
    ready,
    hrefFor,
  }: { onpick: (q: string) => void; onbrowse: () => void; client: SearchClient; ready: boolean; hrefFor: (path: string) => string } = $props();

  const examples: [string, string][] = [
    ['patience prayer', 'words, in any order'],
    ['patiance', 'typos are fine'],
    ['2:255', 'go to a verse'],
    ['baqarah 255', 'surah names'],
    ['bukhari 1', 'hadith numbers'],
    ['qul huwa allahu ahad', 'transliteration'],
    ['الحمد لله رب العالمين', 'Arabic, no diacritics needed'],
  ];
</script>

<section class="empty" aria-label="Examples">
  <p class="brand"><img src="icons/icon-192.png" alt="" width="32" height="32" /><span class="name">Mufahras</span> <span class="ar" lang="ar" dir="rtl">مُفَهْرَس</span></p>
  <h1>Find any verse or hadith</h1>
  <p class="lede">The Quran and the six major hadith collections, searchable as you type. Works offline once loaded.</p>
  <DailyVerse {client} {hrefFor} />
  <ul>
    {#each examples as [q, note] (q)}
      <li>
        <button type="button" onclick={() => onpick(q)}>
          <span class="q" dir="auto">{q}</span>
          <span class="note">{note}</span>
        </button>
      </li>
    {/each}
  </ul>
  <div class="ctas">
    <button type="button" class="browse" onclick={onbrowse}><BookOpen size={18} aria-hidden="true" /> Browse surahs</button>
    <a class="graph" href={hrefFor('graph')}><Network size={18} aria-hidden="true" /> Similar verses graph</a>
  </div>
  <OfflinePanel {client} {ready} />
</section>

<style>
  .empty {
    padding: var(--space-5) var(--space-4);
    max-width: var(--measure);
  }
  .brand {
    margin: 0 0 var(--space-3);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--accent);
  }
  .brand img {
    border-radius: 8px;
  }
  .brand .name {
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .brand .ar {
    font-family: var(--font-quran);
    font-size: var(--text-xl);
    line-height: 1;
  }
  h1 {
    font-size: var(--text-xl);
    margin: 0 0 var(--space-2);
    letter-spacing: -0.01em;
  }
  .lede {
    color: var(--ink-2);
    margin: 0 0 var(--space-5);
  }
  ul {
    list-style: none;
    margin: 0 0 var(--space-5);
    padding: 0;
    display: grid;
    gap: var(--space-1);
  }
  li button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
    min-height: var(--tap);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;
  }
  li button:hover {
    background: var(--surface-2);
  }
  .q {
    font-weight: 500;
    white-space: nowrap;
  }
  .note {
    color: var(--ink-2);
    font-size: var(--text-sm);
    text-align: right;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .graph {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border-radius: 99px;
    border: 1px solid var(--accent);
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
  }
  .browse {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border-radius: 99px;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }
</style>
