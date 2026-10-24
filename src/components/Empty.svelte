<script lang="ts">
  // Shown before typing: examples that demonstrate what the search understands.
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Network from '@lucide/svelte/icons/network';
  import type { SearchClient } from '../lib/search/client';
  import { history } from '../lib/store/history.svelte';
  import { settings } from '../lib/store/settings.svelte';
  import DailyHadith from './DailyHadith.svelte';
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
    ['ayatul kursi', 'well-known names'],
    ['baqarah 255', 'verses by surah name or 2:255'],
    ['bukhari 1', 'hadith numbers'],
    ['qul huwa allahu ahad', 'transliteration'],
    ['الحمد لله رب العالمين', 'Arabic, no diacritics needed'],
    ['fasting', 'topics and hadith chapters'],
    ['Allah does not burden a soul beyond its capacity', 'a quote, worded differently'],
  ];
  // Search by meaning (beta): last, since it needs switching on and a download the first time.
  const meaningExamples: [string, string][] = [
    ['dealing with anxiety', 'by meaning'],
    ['visiting the sick', 'by meaning'],
  ];
  const allExamples = $derived([...examples, ...meaningExamples.map(([q, n]): [string, string] => [q, settings.meaning ? n : `${n}, switch it on in ☰`])]);
  // New users see every example; once there's some history, they fold away behind a link.
  let showExamples = $state(false);
  const examplesOpen = $derived(showExamples || history.list.length < 3 || !settings.history);
</script>

<section class="empty" aria-label="Examples">
  <p class="brand"><img src="icons/icon-192.png" alt="" width="32" height="32" /><span class="name">Mufahras</span> <span class="ar" lang="ar" dir="rtl">مُفَهْرَس</span></p>
  <h1>Find any verse or hadith</h1>
  <p class="lede">The Quran and the six major hadith collections, searchable as you type. Works offline once loaded.</p>
  {#if history.list.length < 3}
  {#if examplesOpen}
  <h2 class="ex-h">Try</h2>
  <ul>
    {#each allExamples as [q, note] (q)}
      <li>
        <button type="button" onclick={() => onpick(q)}>
          <span class="q" dir="auto">{q}</span>
          <span class="note">{note}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="tips">
    Tap any Arabic word in a verse for its meaning. The <strong>☰ menu</strong> has bookmarks, themes, text size and Sakinah mode.
  </p>
  {:else}
    <button type="button" class="show-ex" onclick={() => (showExamples = true)}>Show examples</button>
  {/if}
  {#if !settings.sakinah && settings.history && history.list.length}
    <div class="recent">
      <h2>Recent</h2>
      <ul>
        {#each history.list.slice(0, 6) as e (e.q)}<li><button type="button" onclick={() => onpick(e.q)} dir="auto">{e.q}</button></li>{/each}
      </ul>
    </div>
  {/if}
  {#if !settings.sakinah}
    <DailyVerse {client} {hrefFor} />
    <DailyHadith {client} {hrefFor} />
  {/if}
  {:else}
  {#if !settings.sakinah && settings.history && history.list.length}
    <div class="recent">
      <h2>Recent</h2>
      <ul>
        {#each history.list.slice(0, 6) as e (e.q)}<li><button type="button" onclick={() => onpick(e.q)} dir="auto">{e.q}</button></li>{/each}
      </ul>
    </div>
  {/if}
  {#if !settings.sakinah}
    <DailyVerse {client} {hrefFor} />
    <DailyHadith {client} {hrefFor} />
  {/if}
  {#if examplesOpen}
  <h2 class="ex-h">Try</h2>
  <ul>
    {#each allExamples as [q, note] (q)}
      <li>
        <button type="button" onclick={() => onpick(q)}>
          <span class="q" dir="auto">{q}</span>
          <span class="note">{note}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="tips">
    Tap any Arabic word in a verse for its meaning. The <strong>☰ menu</strong> has bookmarks, themes, text size and Sakinah mode.
  </p>
  {:else}
    <button type="button" class="show-ex" onclick={() => (showExamples = true)}>Show examples</button>
  {/if}
  {/if}
  <div class="ctas">
    <button type="button" class="browse" onclick={onbrowse}><BookOpen size={18} aria-hidden="true" /> Browse surahs</button>
    {#if !settings.sakinah}<a class="graph" href={hrefFor('graph')}><Network size={18} aria-hidden="true" /> Similar verses graph</a>{/if}
  </div>
  {#if !settings.sakinah}<OfflinePanel {client} {ready} />{/if}
</section>

<style>
  .empty {
    padding: var(--space-5) var(--space-4);
    max-width: var(--measure);
  }
  /* On phones the top bar shows the name already. */
  :global(.app:not(.wide)) .brand {
    display: none;
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
    margin: 0 0 var(--space-2);
    padding: 0;
    display: grid;
    /* minmax(0, …): the long quote example can't wrap, and must not widen the column past the screen. */
    grid-template-columns: minmax(0, 1fr);
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
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .ex-h {
    margin: 0 0 var(--space-1);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .tips {
    margin: 0 0 var(--space-5);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .show-ex {
    min-height: var(--tap);
    margin-bottom: var(--space-3);
    color: var(--accent);
    font-weight: 600;
  }
  .note {
    flex: 0 1 auto;
    max-width: 55%;
    color: var(--ink-2);
    font-size: var(--text-sm);
    text-align: right;
  }
  .recent {
    margin-bottom: var(--space-5);
  }
  .recent h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .recent ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .recent button {
    min-height: 36px;
    padding: 0 var(--space-3);
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
    font-size: var(--text-sm);
    max-width: 22ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
