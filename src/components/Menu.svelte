<script lang="ts">
  // The menu drawer: library pages, reading settings, offline storage, privacy and about.
  // Slides in from the start edge; Esc, the close button or the scrim close it.
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import BookMarked from '@lucide/svelte/icons/book-marked';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Download from '@lucide/svelte/icons/download';
  import History from '@lucide/svelte/icons/history';
  import Info from '@lucide/svelte/icons/info';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import Network from '@lucide/svelte/icons/network';
  import Repeat from '@lucide/svelte/icons/repeat';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Star from '@lucide/svelte/icons/star';
  import Tag from '@lucide/svelte/icons/tag';
  import Hand from '@lucide/svelte/icons/hand-heart';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import X from '@lucide/svelte/icons/x';
  import { fly, fade } from 'svelte/transition';
  import { install, promptInstall } from '../lib/install.svelte';
  import { checkMeaning, meaning, removeMeaning, startMeaning, stopMeaning } from '../lib/meaning/meaning.svelte';
  import type { SearchClient } from '../lib/search/client';
  import { bookmarks } from '../lib/store/bookmarks.svelte';
  import { clearHistory, history } from '../lib/store/history.svelte';
  import { ARABIC_SCALES, settings, TEXT_SCALES, updateSettings } from '../lib/store/settings.svelte';
  import { setTheme, theme, THEMES, type ThemeChoice } from '../lib/theme.svelte';
  import OfflinePanel from './OfflinePanel.svelte';

  let {
    onclose,
    onnavigate,
    client,
    ready,
    side,
  }: { onclose: () => void; onnavigate: (path: string) => void; client: SearchClient; ready: boolean; side: 'left' | 'right' } = $props();

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closeButton = $state<HTMLButtonElement>();
  $effect(() => closeButton?.focus());

  const themes: { id: ThemeChoice; label: string; swatch: readonly string[] }[] = [
    { id: 'auto', label: 'Auto', swatch: ['#faf8f3', '#1f242c'] },
    ...THEMES.map((t) => ({ id: t.id, label: t.label, swatch: t.swatch })),
  ];
  const sizeLabels = ['Small', 'Default', 'Large', 'Larger'];

  // Search by meaning: learn its download size and whether it's stored (cheap: no model is loaded).
  checkMeaning();
  const mb = (n: number) => `${Math.round(n / 1e6)}\u00a0MB`; // no line break inside "40 MB"
  const pct = (s: { loaded: number; total: number }) => `${Math.floor((100 * s.loaded) / (s.total || 1))}%`;
  // Chrome reports memory in GB, rounded down; the model needs a few hundred MB while it runs.
  const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 3;
  let removing = $state(false);

  function toggleMeaning(on: boolean): void {
    updateSettings({ meaning: on });
    if (on) startMeaning();
    else stopMeaning();
  }

  async function remove(): Promise<void> {
    removing = true;
    await removeMeaning();
    removing = false;
  }

  const go = (path: string) => {
    onnavigate(path);
    onclose();
  };
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="scrim" onclick={onclose} transition:fade={{ duration: reducedMotion ? 0 : 150 }} aria-hidden="true"></div>
<!-- The drawer opens from the side its ☰ button is on: right on phones, left on desktop. -->
<nav class="drawer" class:right={side === 'right'} aria-label="Menu" data-modal transition:fly={{ x: side === 'right' ? 320 : -320, duration: reducedMotion ? 0 : 220, opacity: 1 }}>
  <header>
    <img src="icons/icon-192.png" alt="" width="36" height="36" />
    <div class="name">Mufahras <span lang="ar" dir="rtl">مُفَهْرَس</span></div>
    <button type="button" class="icon" bind:this={closeButton} onclick={onclose} aria-label="Close menu"><X size={22} aria-hidden="true" /></button>
  </header>

  <section class="sakinah" class:on={settings.sakinah}>
    <label class="row toggle">
      <span>
        <strong>Sakinah mode</strong>
        <small>Search and read, nothing else: no daily cards, suggestions, graph or extras.</small>
      </span>
      <input type="checkbox" checked={settings.sakinah} onchange={(e) => updateSettings({ sakinah: e.currentTarget.checked })} />
    </label>
  </section>

  <section class="meaning" aria-live="polite">
    <label class="row toggle">
      <span>
        <strong>Search by meaning <span class="beta">beta</span></strong>
        <small>
          Also finds verses and hadith that say what you typed in other words, like “dealing with worry” or “kindness to parents”.
          English only. Runs on this device{meaning.status.download ? `, after a one-time download of about ${mb(meaning.status.download)}` : ''}.
        </small>
      </span>
      <input type="checkbox" checked={settings.meaning} onchange={(e) => toggleMeaning(e.currentTarget.checked)} />
    </label>
    {#if settings.meaning}
      {#if meaning.status.state === 'downloading'}
        <progress max={meaning.status.total} value={meaning.status.loaded} aria-label="Downloading search by meaning"></progress>
        <p class="note">Downloading: {pct(meaning.status)}. You can keep searching meanwhile.</p>
      {:else if meaning.status.state === 'loading'}
        <p class="note">Preparing…</p>
      {:else if meaning.status.state === 'ready'}
        <p class="note">Ready, and works offline.</p>
      {:else if meaning.status.state === 'error'}
        <p class="note error">Couldn't load: {meaning.status.error}</p>
        <button type="button" class="plain" onclick={startMeaning}>Try again</button>
      {/if}
    {:else if lowMemory}
      <p class="note">This device reports little memory, so search by meaning may be slow or fail to load.</p>
    {/if}
    {#if meaning.status.stored && !settings.meaning}
      <button type="button" class="plain" onclick={remove} disabled={removing}>{removing ? 'Removing…' : `Remove its files (${mb(meaning.status.total)})`}</button>
    {/if}
  </section>

  <section>
    <h2>Library</h2>
    <ul class="links">
      <li><button type="button" onclick={() => go('bookmarks')}><Bookmark size={18} aria-hidden="true" /> Bookmarks <span class="n">{bookmarks.list.length || ''}</span></button></li>
      {#if settings.history}
        <li><button type="button" onclick={() => go('history')}><History size={18} aria-hidden="true" /> Search history <span class="n">{history.list.length || ''}</span></button></li>
      {/if}
      <li><button type="button" onclick={() => go('surahs')}><BookOpen size={18} aria-hidden="true" /> Surahs</button></li>
      <li><button type="button" onclick={() => go('books')}><BookMarked size={18} aria-hidden="true" /> Hadith collections</button></li>
      <li><button type="button" onclick={() => go('names-of-allah')}><Star size={18} aria-hidden="true" /> The 99 Names of Allah</button></li>
      <li><button type="button" onclick={() => go('names')}><Sparkles size={18} aria-hidden="true" /> Well-known names</button></li>
      <li><button type="button" onclick={() => go('duas')}><Hand size={18} aria-hidden="true" /> Duas of the Quran</button></li>
      <li><button type="button" onclick={() => go('sajdah')}><ArrowDownToLine size={18} aria-hidden="true" /> Sajdah verses</button></li>
      {#if !settings.sakinah}
        <li><button type="button" onclick={() => go('topics')}><Tag size={18} aria-hidden="true" /> Topics</button></li>
        <li><button type="button" onclick={() => go('phrases')}><Repeat size={18} aria-hidden="true" /> Repeated phrases</button></li>
      {/if}
      {#if !settings.sakinah}
        <li><button type="button" onclick={() => go('graph')}><Network size={18} aria-hidden="true" /> Similar verses graph</button></li>
      {/if}
    </ul>
  </section>

  <section>
    <h2 id="theme-h">Theme</h2>
    <div class="themes" role="radiogroup" aria-labelledby="theme-h">
      {#each themes as t (t.id)}
        <button type="button" role="radio" aria-checked={theme.choice === t.id} class:on={theme.choice === t.id} onclick={() => setTheme(t.id)}>
          <span class="swatch" style:--a={t.swatch[0]} style:--b={t.swatch[1]} aria-hidden="true"></span>
          {t.label}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Reading</h2>
    <div class="row">
      <span id="ts-l">Text size</span>
      <div class="seg" role="radiogroup" aria-labelledby="ts-l">
        {#each TEXT_SCALES as s, k (s)}
          <button type="button" role="radio" aria-checked={settings.textScale === s} aria-label={sizeLabels[k]} class:on={settings.textScale === s} onclick={() => updateSettings({ textScale: s })}>
            <span style:font-size={`${0.75 + k * 0.12}rem`}>A</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="row">
      <span id="as-l">Arabic size</span>
      <div class="seg" role="radiogroup" aria-labelledby="as-l">
        {#each ARABIC_SCALES as s, k (s)}
          <button type="button" role="radio" aria-checked={settings.arabicScale === s} aria-label={sizeLabels[k]} class:on={settings.arabicScale === s} onclick={() => updateSettings({ arabicScale: s })}>
            <span lang="ar" style:font-size={`${0.85 + k * 0.18}rem`} style:font-family="var(--font-quran)">ع</span>
          </button>
        {/each}
      </div>
    </div>
    <label class="row toggle">
      <span>Transliteration under verses</span>
      <input type="checkbox" checked={settings.translit} onchange={(e) => updateSettings({ translit: e.currentTarget.checked })} />
    </label>
    <p class="note">Arabic script: Uthmani. IndoPak is coming once its font is in place.</p>
  </section>

  <section>
    <h2>Offline</h2>
    <OfflinePanel {client} {ready} />
  </section>

  <section>
    <h2>Privacy</h2>
    <label class="row toggle">
      <span>Remember my searches <small>on this device only</small></span>
      <input
        type="checkbox"
        checked={settings.history}
        onchange={(e) => {
          updateSettings({ history: e.currentTarget.checked });
          if (!e.currentTarget.checked) clearHistory();
        }}
      />
    </label>
    {#if settings.history && history.list.length}
      <button type="button" class="plain" onclick={clearHistory}>Clear search history</button>
    {/if}
    <p class="note">No accounts, no tracking. Searches never leave this device.</p>
  </section>

  <section>
    <h2>About</h2>
    <ul class="links">
      {#if !install.installed && install.available}
        <li><button type="button" onclick={promptInstall}><Download size={18} aria-hidden="true" /> Install app</button></li>
      {:else if !install.installed && install.ios}
        <li class="note">To install: tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.</li>
      {/if}
      <li><button type="button" onclick={() => go('about')}><Info size={18} aria-hidden="true" /> About and credits</button></li>
      <li>
        <a href="https://github.com/omeiirr/mufahras/issues/new/choose" target="_blank" rel="noopener"><MessageSquare size={18} aria-hidden="true" /> Send feedback</a>
      </li>
    </ul>
  </section>
</nav>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 30; /* above the graph page (20) */
    background: rgb(0 0 0 / 0.35);
  }
  .drawer {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 31;
    width: min(340px, 88vw);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--bg);
    border-right: 1px solid var(--line);
    box-shadow: var(--shadow);
    padding: calc(env(safe-area-inset-top) + var(--space-2)) var(--space-3) calc(env(safe-area-inset-bottom) + var(--space-5));
  }
  .drawer.right {
    inset: 0 0 0 auto;
    border-right: 0;
    border-left: 1px solid var(--line);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0 var(--space-1) var(--space-2);
  }
  header img {
    border-radius: 9px;
  }
  .name {
    flex: 1;
    font-weight: 700;
    color: var(--accent);
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }
  .name span {
    font-family: var(--font-quran);
    font-size: var(--text-lg);
    font-weight: 400;
  }
  section {
    border-top: 1px solid var(--line);
    padding: var(--space-3) var(--space-1);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .links button,
  .links a {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--ink);
    text-decoration: none;
    text-align: left;
  }
  .links button:hover,
  .links a:hover {
    background: var(--surface-2);
  }
  .links :global(svg) {
    color: var(--accent);
    flex: none;
  }
  .n {
    margin-left: auto;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .themes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: var(--space-2);
  }
  .themes button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }
  .themes button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 600;
  }
  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: linear-gradient(135deg, var(--a) 50%, var(--b) 50%);
    flex: none;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--tap);
  }
  .row small {
    display: block;
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
  .seg {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--surface-2);
    border-radius: 99px;
  }
  .seg button {
    width: 40px;
    height: 36px;
    border-radius: 99px;
    display: grid;
    place-items: center;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--accent);
  }
  .sakinah.on {
    background: var(--accent-soft);
    border-radius: var(--radius-sm);
  }
  .sakinah strong,
  .meaning strong {
    display: block;
  }
  .beta {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    margin-left: var(--space-1);
  }
  .meaning progress {
    width: 100%;
    accent-color: var(--accent);
  }
  .note.error {
    color: var(--daif);
  }
  .note {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
  .plain {
    min-height: var(--tap);
    color: var(--accent);
    font-weight: 600;
  }
  .icon {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
  }
  .icon:hover {
    background: var(--surface-2);
  }
  /* The offline panel's own card border is redundant inside the drawer. */
  section :global(.offline) {
    margin-top: 0;
  }
</style>
