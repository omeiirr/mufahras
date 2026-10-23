<script lang="ts">
  // Below a verse: Al-Mukhtasar explanation, topics, similar ayahs and repeated phrases (mutashabihat).
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Network from '@lucide/svelte/icons/network';
  import Tag from '@lucide/svelte/icons/tag';
  import type { AyahDetail, AyahExtra } from '../lib/data/views';
  import Highlighted from './Highlighted.svelte';

  let { d, extra, hrefFor }: { d: AyahDetail; extra: AyahExtra; hrefFor: (path: string) => string } = $props();

  let tafsirOpen = $state(false);
  let openPhrase = $state<number | null>(null);
  const LONG = 420;
  const range = (from: number, to: number) => (from === to ? `${d.surah.n}:${from}` : `${d.surah.n}:${from}–${to}`);
</script>

{#if extra.tafsir}
  <section aria-labelledby="tafsir-h">
    <h2 id="tafsir-h">
      Explanation
      {#if extra.tafsir.from !== extra.tafsir.to}<span class="sub">of {range(extra.tafsir.from, extra.tafsir.to)}</span>{/if}
    </h2>
    <p class="tafsir" class:clamped={!tafsirOpen && extra.tafsir.text.length > LONG}>{extra.tafsir.text}</p>
    {#if extra.tafsir.text.length > LONG}
      <button type="button" class="more" aria-expanded={tafsirOpen} onclick={() => (tafsirOpen = !tafsirOpen)}>
        {tafsirOpen ? 'Show less' : 'Read more'}
      </button>
    {/if}
    <p class="credit">From <em>Abridged Explanation of the Quran</em> (Al-Mukhtasar), Tafsir Center for Quranic Studies</p>
  </section>
{/if}

{#if extra.topics.length}
  <section aria-labelledby="topics-h">
    <h2 id="topics-h">Topics</h2>
    <ul class="tags">
      {#each extra.topics as t (t.id)}
        <li><a href={hrefFor(`topic/${t.id}`)}><Tag size={14} aria-hidden="true" /> {t.name} <span class="n">{t.count}</span></a></li>
      {/each}
    </ul>
  </section>
{/if}

{#if extra.similar.length}
  <section aria-labelledby="similar-h">
    <h2 id="similar-h">
      Similar verses <span class="sub">shared wording highlighted</span>
      <a class="graph-link" href={hrefFor(`graph/${d.surah.n}:${d.ayah}`)}><Network size={14} aria-hidden="true" /> See in graph</a>
    </h2>
    <ul class="list">
      {#each extra.similar as s (`${s.surah}:${s.ayah}`)}
        <li>
          <a href={hrefFor(`${s.surah}:${s.ayah}`)}>
            <span class="ref">{s.surah}:{s.ayah} <span class="sub">{s.name}</span></span>
            <span class="quran small" lang="ar" dir="rtl"><Highlighted text={s.ar} ranges={s.ranges} /></span>
            <span class="en">{s.en}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if extra.phrases.length}
  <section aria-labelledby="phrases-h">
    <h2 id="phrases-h">Repeated phrases <span class="sub">mutashabihat</span></h2>
    <ul class="list">
      {#each extra.phrases as p, k (k)}
        <li class="phrase">
          <button type="button" aria-expanded={openPhrase === k} onclick={() => (openPhrase = openPhrase === k ? null : k)}>
            <span class="quran small" lang="ar" dir="rtl">{p.text}</span>
            <span class="count">in {p.count} other {p.count === 1 ? 'ayah' : 'ayahs'} <ChevronDown size={16} aria-hidden="true" /></span>
          </button>
          {#if openPhrase === k}
            <p class="refs">
              {#each p.refs as r (`${r.surah}:${r.ayah}`)}<a href={hrefFor(`${r.surah}:${r.ayah}`)} title={r.name}>{r.surah}:{r.ayah}</a>{/each}
              {#if p.count > p.refs.length}<span class="sub">and {p.count - p.refs.length} more</span>{/if}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  section {
    border-top: 1px solid var(--line);
    padding-top: var(--space-4);
  }
  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  h2 .sub {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    margin-left: var(--space-1);
  }
  .sub {
    color: var(--ink-2);
    font-weight: 400;
  }
  .graph-link {
    float: right;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;
    text-decoration: none;
  }
  .tafsir {
    margin: 0;
    line-height: 1.7;
  }
  .tafsir.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 6;
    line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .more {
    margin-top: var(--space-1);
    min-height: var(--tap);
    color: var(--accent);
    font-weight: 600;
  }
  .credit {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
  .tags {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .tags a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 var(--space-3);
    border-radius: 99px;
    border: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    font-size: var(--text-sm);
    position: relative;
  }
  .tags a::after {
    content: '';
    position: absolute;
    inset: -4px 0;
  }
  .tags a:hover {
    border-color: var(--accent);
  }
  .tags :global(svg) {
    color: var(--accent);
  }
  .tags .n {
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-1);
  }
  .list a {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    color: inherit;
    text-decoration: none;
  }
  .list a:hover {
    background: var(--surface-2);
  }
  .ref {
    font-weight: 600;
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .quran.small {
    font-size: 1.35rem;
    line-height: 2;
  }
  .en {
    color: var(--ink-2);
    font-size: var(--text-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .phrase button {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;
  }
  .phrase button:hover {
    background: var(--surface-2);
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .phrase button[aria-expanded='true'] .count :global(svg) {
    transform: rotate(180deg);
  }
  .refs {
    margin: 0;
    padding: 0 var(--space-3) var(--space-3);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }
  .refs a {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-weight: 500;
  }
</style>
