<script lang="ts">
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import type { AyahDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';
  import VerseWords from './VerseWords.svelte';
  import { settings } from '../lib/store/settings.svelte';
  import { ayahMarker, placeName } from '../lib/ui/format';
  import { addShortcuts, go, openWords } from '../lib/ui/keys';
  import Actions from './Actions.svelte';
  import VerseExtras from './VerseExtras.svelte';

  let { d, hrefFor, client }: { d: AyahDetail; hrefFor: (path: string) => string; client: SearchClient } = $props();

  const ref = $derived(`${d.surah.n}:${d.ayah}`);

  const plainEn = $derived(d.en.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, ''));
  const bookmark = $derived({ path: ref, kind: 'ayah' as const, label: ref, sublabel: d.surah.nameSimple, text: plainEn.slice(0, 220) });
  const card = $derived({ ar: `${d.ar} ${ayahMarker(d.ayah)}`, arFont: 'quran' as const, en: plainEn, ref: `Quran ${ref}`, sub: `${d.surah.nameSimple} · ${d.surah.nameAr}` });
  const copyText = $derived(`${d.ar}\n\n${d.en.replace(/[¹²³⁰-⁹]/g, '')}\n\n— Quran ${ref} (${d.surah.nameSimple})`);

  $effect(() =>
    addShortcuts('This verse', 1, () => [
      { keys: ['ArrowLeft'], label: 'Previous verse', when: () => !!d.prev, run: () => go(hrefFor(`${d.prev!.surah}:${d.prev!.ayah}`)) },
      { keys: ['ArrowRight'], label: 'Next verse', when: () => !!d.next, run: () => go(hrefFor(`${d.next!.surah}:${d.next!.ayah}`)) },
      { keys: ['w'], label: 'Word by word', run: () => openWords('.verse') },
      { keys: ['r'], label: 'Read the surah from here', run: () => go(hrefFor(`surah/${d.surah.n}/${d.ayah}`)) },
    ]),
  );
</script>

<article class="verse">
  <header>
    <h1>{ref}</h1>
    <p class="where">
      <span>{d.surah.nameSimple}</span>
      <span class="ar-name" lang="ar" dir="rtl">{d.surah.nameAr}</span>
      <span>· {placeName(d.surah.place)}</span>
    </p>
    {#if d.extra?.theme && !settings.sakinah}
      <p class="theme">
        <a href={hrefFor(`surah/${d.surah.n}/${d.extra.theme.from}`)}>{d.extra.theme.text}</a>
        <span>· {d.extra.theme.from === d.extra.theme.to ? `${d.surah.n}:${d.extra.theme.from}` : `${d.surah.n}:${d.extra.theme.from}–${d.extra.theme.to}`}</span>
      </p>
    {/if}
  </header>

  <VerseWords ar={d.ar} surah={d.surah.n} ayah={d.ayah} {client} hint />
  {#if d.translit && settings.translit}<p class="translit">{d.translit}</p>{/if}
  <p class="en">{d.en}</p>

  {#if d.footnotes.length}
    <ol class="notes" aria-label="Footnotes">
      {#each d.footnotes as note, i (i)}<li>{note}</li>{/each}
    </ol>
  {/if}
  <p class="credit">Translation: Saheeh International</p>

  <Actions text={copyText} title={`Quran ${ref}`} {bookmark} {card} />

  {#if settings.sakinah}
    <!-- Sakinah mode: the verse and its translation only. -->
  {:else if d.extra}
    <VerseExtras {d} extra={d.extra} {hrefFor} />
  {:else}
    <p class="loading-extra">Loading explanation, topics and similar verses…</p>
  {/if}

  <nav class="pager" aria-label="Neighbouring verses">
    {#if d.prev}
      <a href={hrefFor(`${d.prev.surah}:${d.prev.ayah}`)}><ChevronLeft size={18} aria-hidden="true" /> {d.prev.surah}:{d.prev.ayah}</a>
    {:else}<span></span>{/if}
    <a class="read" href={hrefFor(`surah/${d.surah.n}/${d.ayah}`)}><BookOpen size={18} aria-hidden="true" /> Read surah</a>
    {#if d.next}
      <a href={hrefFor(`${d.next.surah}:${d.next.ayah}`)}>{d.next.surah}:{d.next.ayah} <ChevronRight size={18} aria-hidden="true" /></a>
    {:else}<span></span>{/if}
  </nav>
</article>

<style>
  .verse {
    display: grid;
    gap: var(--space-4);
  }
  header h1 {
    margin: 0;
    font-size: var(--text-xl);
    color: var(--accent);
  }
  .where {
    margin: 0;
    color: var(--ink-2);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: baseline;
  }
  .ar-name {
    font-family: var(--font-arabic);
    font-size: var(--text-lg);
  }
  .verse > :global(.quran) {
    margin: var(--space-2) 0 0;
  }
  .theme {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .theme a {
    color: var(--ink);
    text-decoration-color: var(--line);
  }
  .loading-extra {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .translit {
    margin: 0;
    color: var(--ink-2);
    font-style: italic;
  }
  .en {
    margin: 0;
    font-size: var(--text-lg);
    line-height: 1.65;
  }
  .notes {
    margin: 0;
    padding-left: 1.4em;
    color: var(--ink-2);
    font-size: var(--text-sm);
    display: grid;
    gap: var(--space-2);
  }
  .notes li::marker {
    font-size: var(--text-xs);
  }
  .credit {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
  .pager {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    border-top: 1px solid var(--line);
    padding-top: var(--space-3);
  }
  .pager a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 500;
  }
  .pager a:hover {
    background: var(--surface-2);
  }
  .pager a:last-child {
    justify-self: end;
  }
</style>
