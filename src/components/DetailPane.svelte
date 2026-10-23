<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import type { Detail } from '../lib/data/views';
  import { detailFor } from '../lib/router.svelte';
  import type { SearchClient } from '../lib/search/client';
  import HadithView from './HadithView.svelte';
  import SectionView from './SectionView.svelte';
  import TopicView from './TopicView.svelte';
  import SurahIndex from './SurahIndex.svelte';
  import SurahView from './SurahView.svelte';
  import VerseView from './VerseView.svelte';

  let {
    path,
    client,
    showBack,
    onback,
    hrefFor,
  }: { path: string; client: SearchClient; showBack: boolean; onback: () => void; hrefFor: (path: string) => string } = $props();

  let detail = $state<Detail | null>(null);
  let loading = $state(false);
  let missing = $state(false);
  let scroller = $state<HTMLElement>();
  const target = $derived(detailFor(path));

  $effect(() => {
    const t = target;
    missing = false;
    if (!t) {
      detail = null;
      missing = !!path;
      return;
    }
    let current = true;
    loading = true;
    detail = null;
    client.detail(t.req).then((d) => {
      if (!current) return;
      detail = d;
      missing = !d;
      loading = false;
      // New screen starts at the top (the surah reader then scrolls to its target ayah).
      if (!t.scrollTo) scroller?.scrollTo({ top: 0 });
      // Hadith: the English shows at once; the book's Arabic (up to 1.3 MB) follows when loaded.
      if (d?.kind === 'hadith' && !d.ar && t.req.kind === 'hadith')
        client.detail({ ...t.req, arabic: true }).then((full) => current && full && (detail = full));
      // Verse: the text shows at once; tafsir, topics and similar ayahs follow when their chunks load.
      if (d?.kind === 'ayah' && !d.extra && t.req.kind === 'ayah')
        client.detail({ ...t.req, extra: true }).then((full) => current && full && (detail = full));
    });
    return () => (current = false);
  });

  const title = $derived.by(() => {
    if (!detail) return '';
    if (detail.kind === 'ayah') return `${detail.surah.n}:${detail.ayah} · ${detail.surah.nameSimple}`;
    if (detail.kind === 'surah') return `${detail.surah.n}. ${detail.surah.nameSimple}`;
    if (detail.kind === 'surahs') return 'Surahs';
    if (detail.kind === 'topic') return detail.name;
    if (detail.kind === 'section') return `${detail.short} · ${detail.name}`;
    if (detail.kind === 'graph') return 'Similar verses';
    return `${detail.short} ${detail.number}`;
  });
</script>

<div class="pane">
  {#if showBack}
    <header class="top">
      <button type="button" class="back" onclick={onback} aria-label="Back to results"><ArrowLeft size={22} aria-hidden="true" /></button>
      <span class="title">{title}</span>
    </header>
  {/if}
  <div class="scroll" bind:this={scroller}>
    <div class="content" aria-busy={loading}>
      {#if missing}
        <p class="missing">This reference doesn't exist. <button type="button" onclick={onback}>Back to search</button></p>
      {:else if detail?.kind === 'ayah'}
        <VerseView d={detail} {hrefFor} />
      {:else if detail?.kind === 'surah'}
        <SurahView d={detail} scrollTo={target?.scrollTo} {hrefFor} />
      {:else if detail?.kind === 'surahs'}
        <SurahIndex d={detail} {hrefFor} />
      {:else if detail?.kind === 'hadith'}
        <HadithView d={detail} {hrefFor} />
      {:else if detail?.kind === 'topic'}
        <TopicView d={detail} {hrefFor} />
      {:else if detail?.kind === 'section'}
        <SectionView d={detail} {hrefFor} />
      {:else if loading}
        <p class="loading">Loading…</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--bg);
  }
  .top {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: calc(env(safe-area-inset-top) + var(--space-1)) var(--space-2) var(--space-1);
    border-bottom: 1px solid var(--line);
    background: var(--bg);
  }
  .back {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
  }
  .back:hover {
    background: var(--surface-2);
  }
  .title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .content {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) calc(env(safe-area-inset-bottom) + var(--space-6));
  }
  .missing,
  .loading {
    color: var(--ink-2);
  }
  .missing button {
    color: var(--accent);
    text-decoration: underline;
  }
</style>
