<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import type { SurahDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';
  import { placeName } from '../lib/ui/format';
  import VerseWords from './VerseWords.svelte';

  let { d, scrollTo, hrefFor, client }: { d: SurahDetail; scrollTo?: number; hrefFor: (path: string) => string; client: SearchClient } = $props();

  // Bismillah is shown as a heading except where it is ayah 1 (Al-Fatihah) or absent (At-Tawbah).
  const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

  $effect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`ayah-${d.surah.n}-${scrollTo}`);
    el?.scrollIntoView({ block: 'start' });
  });
</script>

<article class="surah">
  <header>
    <p class="name-ar" lang="ar" dir="rtl">{d.surah.nameAr}</p>
    <h1>{d.surah.n}. {d.surah.nameSimple}</h1>
    <p class="facts">{placeName(d.surah.place)} · {d.surah.count} ayahs · revelation order {d.surah.order}</p>
  </header>

  {#if d.surah.bismillah}<p class="quran bismillah" lang="ar" dir="rtl">{BISMILLAH}</p>{/if}

  <ol class="ayahs">
    {#each d.ayahs as a (a.ayah)}
      <li id={`ayah-${d.surah.n}-${a.ayah}`} class:target={scrollTo === a.ayah}>
        <VerseWords ar={a.ar} surah={d.surah.n} ayah={a.ayah} {client} />
        <p class="en"><a class="num" href={hrefFor(`${d.surah.n}:${a.ayah}`)}>{d.surah.n}:{a.ayah}</a> {a.en}</p>
      </li>
    {/each}
  </ol>

  <nav class="pager" aria-label="Neighbouring surahs">
    {#if d.prev}<a href={hrefFor(`surah/${d.prev.n}`)}><ChevronLeft size={18} aria-hidden="true" /> {d.prev.nameSimple}</a>{:else}<span></span>{/if}
    {#if d.next}<a href={hrefFor(`surah/${d.next.n}`)}>{d.next.nameSimple} <ChevronRight size={18} aria-hidden="true" /></a>{/if}
  </nav>
</article>

<style>
  header {
    text-align: center;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--line);
  }
  .name-ar {
    margin: 0;
    font-family: var(--font-quran);
    font-size: calc(2.25rem * var(--arabic-scale, 1));
    line-height: 1.6;
    color: var(--accent);
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .facts {
    margin: var(--space-1) 0 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .bismillah {
    text-align: center;
    margin: var(--space-4) 0 0;
  }
  .ayahs {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .ayahs li {
    padding: var(--space-4) var(--space-2);
    border-bottom: 1px solid var(--line);
    scroll-margin-top: var(--space-4);
    border-radius: var(--radius-sm);
  }
  .ayahs li.target {
    background: var(--accent-soft);
  }
  .ayahs :global(p) {
    margin: 0;
  }
  .ayahs li > :global(.card) {
    margin-top: var(--space-2);
  }
  .en {
    margin-top: var(--space-2) !important;
    line-height: 1.65;
  }
  .num {
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: none;
    margin-right: var(--space-1);
  }
  .pager {
    display: flex;
    justify-content: space-between;
    padding-top: var(--space-4);
  }
  .pager a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    text-decoration: none;
    font-weight: 500;
  }
</style>
