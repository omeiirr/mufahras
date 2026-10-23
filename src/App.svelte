<script lang="ts">
  // App shell. Phone: results with the search bar docked at the bottom; opening a result slides a
  // detail screen over them (Back returns, scroll kept). Desktop (≥ 1024px): results on the left,
  // the selected result's detail on the right; ↑/↓ move the selection. See "UI design" in PLAN.md.
  import { untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import DetailPane from './components/DetailPane.svelte';
  import Empty from './components/Empty.svelte';
  import FilterChips from './components/FilterChips.svelte';
  import ResultList from './components/ResultList.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import Menu from './components/Menu.svelte';
  import { recordSearch } from './lib/store/history.svelte';
  import { back, navigate, route, type Corpus } from './lib/router.svelte';
  import { SearchClient } from './lib/search/client';
  import type { PresentedHit, SearchResponse } from './lib/search/types';
  import type { LoadStatus } from './lib/search/worker';

  const PAGE = 30;

  let response = $state<SearchResponse | null>(null);
  let status = $state<LoadStatus>({ loaded: [], ready: false });
  let input = $state<HTMLInputElement>();
  let query = $state(route.q);

  const client = new SearchClient(
    new URL('data/', document.baseURI).href,
    (r) => (response = r),
    (s) => (status = s),
  );

  // ---- layout

  const wideQuery = matchMedia('(min-width: 1024px)');
  let wide = $state(wideQuery.matches);
  wideQuery.addEventListener('change', (e) => (wide = e.matches));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // iOS keeps the layout viewport when the keyboard opens; lift the bottom dock by the keyboard's height.
  // (Android Chrome resizes the layout instead, via interactive-widget=resizes-content.)
  $effect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  });

  // ---- URL ⇄ input

  // Typing replaces the history entry; Back/forward (route.q changing) updates the input.
  $effect(() => {
    const q = query;
    untrack(() => navigate({ q }, { replace: true }));
  });
  $effect(() => {
    const q = route.q;
    untrack(() => {
      if (q !== query) query = q;
    });
  });

  // ---- searching, with more pages loaded on scroll

  const searchKey = $derived(`${route.q}|${route.corpus}|${route.sahih}`);
  let pages = $state({ key: '', n: 1 });
  const pageCount = $derived(pages.key === searchKey ? pages.n : 1);

  $effect(() => {
    client.search(route.q, { corpus: route.corpus, minGrade: route.sahih ? 'sahih' : undefined, limit: PAGE * pageCount });
  });

  const hasQuery = $derived(route.q.trim() !== '');
  const shown = $derived(hasQuery && response ? response : null);
  const allHits = $derived<PresentedHit[]>(shown ? [...shown.pinned, ...shown.hits] : []);

  // The graph is its own full-window page (lazy-loaded), not a detail in the pane.
  const graphRoute = $derived(route.path === 'graph' || route.path.startsWith('graph/'));
  const graphFocus = $derived(route.path.startsWith('graph/') ? route.path.slice('graph/'.length) : null);
  const path = $derived(graphRoute ? '' : route.path);

  // Desktop shows the first result until one is chosen; with no query, the surah index.
  const detailPath = $derived(path || (wide ? (allHits[0]?.path ?? (hasQuery ? '' : 'surahs')) : ''));
  const selectedKey = $derived(allHits.find((h) => h.path === detailPath)?.key ?? null);

  function hrefFor(path: string): string {
    const params = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?')) : '';
    return `#/${path}${params}`;
  }

  let menuOpen = $state(false);

  function open(hit: PresentedHit): void {
    recordSearch(route.q);
    navigate({ path: hit.path });
  }

  /** Run a search from history or elsewhere: back to the results with this query. */
  function searchFor(q: string): void {
    query = q;
    navigate({ path: '', q });
  }

  function onFilter(patch: { corpus?: Corpus; sahih?: boolean }): void {
    navigate(patch, { replace: true });
  }

  // ---- keyboard

  function onInputKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!allHits.length) return;
      e.preventDefault();
      const at = allHits.findIndex((h) => h.key === selectedKey);
      const next = allHits[Math.min(allHits.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]!;
      navigate({ path: next.path }, { replace: true });
    } else if (e.key === 'Enter') {
      const hit = allHits.find((h) => h.key === selectedKey) ?? allHits[0];
      if (!hit) return;
      e.preventDefault();
      if (!wide) input?.blur();
      if (hit.path !== route.path) open(hit);
    } else if (e.key === 'Escape' && query) {
      e.preventDefault();
      query = '';
    }
  }

  function onWindowKey(e: KeyboardEvent): void {
    // An open drawer or sheet handles its own keys (Esc closes it, and must not also navigate back).
    if (document.querySelector('[data-modal]')) return;
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      input?.focus();
      input?.select();
    } else if (e.key === 'Escape' && !typing && route.path) {
      e.preventDefault();
      if (wide) navigate({ path: '' }, { replace: true });
      else back();
    }
  }

  const hadithLoaded = $derived(status.loaded.filter((n) => /^hadith-\w+$/.test(n) && !n.endsWith('-ar')).length);
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="app" class:wide>
  <section class="results" aria-label="Search">
    <div class="dock">
      <div class="row">
        <button type="button" class="menu-button" onclick={() => (menuOpen = true)} aria-label="Menu" aria-expanded={menuOpen}>
          <MenuIcon size={22} aria-hidden="true" />
        </button>
        <FilterChips corpus={route.corpus} sahih={route.sahih} onchange={onFilter} />
      </div>
      <SearchBar bind:value={query} bind:input onkeydown={onInputKey} />
    </div>

    <div class="scroll">
      {#if status.error}
        <p class="note error" role="alert">Couldn't load the data: {status.error}</p>
      {/if}
      {#if !hasQuery}
        <Empty onpick={(q) => (query = q)} onbrowse={() => navigate({ path: 'surahs' })} {client} ready={status.ready} {hrefFor} />
      {:else if !shown}
        <p class="note">Loading the Quran…</p>
      {:else}
        <ResultList
          response={shown}
          {selectedKey}
          onopen={open}
          onmore={() => (pages = { key: searchKey, n: pageCount + 1 })}
          onsuggest={(patch) => navigate(patch, { replace: true })}
          {hrefFor}
        />
      {/if}
      {#if !hasQuery && status.loaded.includes('quran') && !status.ready}
        <p class="note small">Loading hadith collections ({hadithLoaded}/6)…</p>
      {/if}
    </div>
  </section>

  {#if wide}
    <section class="detail" aria-label="Selected result">
      {#if detailPath}
        <DetailPane path={detailPath} {client} showBack={false} onback={() => navigate({ path: '' }, { replace: true })} {hrefFor} onsearch={searchFor} />
      {:else}
        <p class="note placeholder">Nothing selected.</p>
      {/if}
    </section>
  {:else if path}
    <section class="detail overlay" aria-label="Selected result" transition:fly={{ x: 48, duration: reducedMotion ? 0 : 200, opacity: 0 }}>
      <DetailPane {path} {client} showBack={true} onback={back} {hrefFor} onsearch={searchFor} onmenu={() => (menuOpen = true)} />
    </section>
  {/if}

  {#if menuOpen}
    <Menu {client} ready={status.ready} onclose={() => (menuOpen = false)} onnavigate={(p) => navigate({ path: p })} />
  {/if}

  {#if graphRoute}
    {#await import('./components/GraphPage.svelte') then { default: GraphPage }}
      <GraphPage
        {client}
        focus={graphFocus}
        onback={back}
        onopen={(p) => navigate({ path: p })}
        onfocus={(ref) => navigate({ path: ref ? `graph/${ref}` : 'graph' }, { replace: true })}
        onmenu={() => (menuOpen = true)}
      />
    {/await}
  {/if}
</div>

<style>
  .app {
    /* Fill the window exactly. 100% follows html/body; 100dvh can come out a pixel short in installed apps. */
    height: 100%;
    display: grid;
    /* minmax(0, …) both ways: a long line must wrap and a tall start screen must scroll inside its pane,
       not stretch the grid past the window (which pushed the search bar off screen). */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }

  /* Phone: results scroll above a dock pinned to the bottom (chips, then the bar). */
  .results {
    display: flex;
    flex-direction: column-reverse;
    min-height: 0;
    min-width: 0;
  }
  .dock {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom));
    margin-bottom: var(--kb, 0px);
    background: linear-gradient(to bottom, transparent, var(--bg) 18%);
    position: relative;
    z-index: 1;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .row > :global(.chips) {
    min-width: 0;
    flex: 1;
  }
  .menu-button {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
    color: var(--ink);
  }
  .menu-button:hover {
    background: var(--surface-2);
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-top: env(safe-area-inset-top);
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: var(--bg);
    box-shadow: var(--shadow);
  }

  /* Desktop: search column on the left (bar on top), detail on the right. */
  .app.wide {
    grid-template-columns: minmax(360px, 440px) minmax(0, 1fr);
  }
  .wide .results {
    flex-direction: column;
    border-right: 1px solid var(--line);
  }
  .wide .dock {
    display: flex;
    flex-direction: column-reverse;
    padding: var(--space-4) var(--space-3) var(--space-2);
    margin-bottom: 0;
    background: var(--bg);
  }
  .wide .scroll {
    padding-top: 0;
  }
  .detail {
    min-height: 0;
  }

  .note {
    color: var(--ink-2);
    padding: var(--space-3) var(--space-4);
    margin: 0;
  }
  .note.small {
    font-size: var(--text-sm);
  }
  .note.error {
    color: var(--daif);
  }
  .placeholder {
    padding: var(--space-6);
  }
</style>
