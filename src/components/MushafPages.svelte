<script lang="ts">
  // A surah on the pages of the printed Madani mushaf (KFGQPC V2, 15 lines): each line as in print,
  // justified to the page width. The font differs from the print's, so a line that would overflow is
  // set a little smaller rather than wrapped.
  import type { MushafDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';
  import { ayahMarker } from '../lib/ui/format';

  let { surah, client, hrefFor, scrollTo }: { surah: number; client: SearchClient; hrefFor: (path: string) => string; scrollTo?: number } = $props();

  const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
  let d = $state<MushafDetail | null>(null);
  let failed = $state(false);

  $effect(() => {
    const n = surah;
    d = null;
    failed = false;
    client.detail({ kind: 'mushaf', surah: n }).then((r) => {
      if (r?.kind === 'mushaf' && r.surah === n) d = r;
      else failed = true;
    });
  });

  $effect(() => {
    if (!d || !scrollTo) return;
    document.getElementById(`ayah-${surah}-${scrollTo}`)?.scrollIntoView({ block: 'center' });
  });

  /** Shrinks a line that overflows the page, and checks again whenever the page is resized. */
  function fit(node: HTMLElement) {
    const check = () => {
      node.style.fontSize = '';
      // Text doesn't scale exactly with its size (shaping, rounding), so check again after shrinking.
      for (let tries = 0; tries < 3 && node.scrollWidth > node.clientWidth + 1; tries++) {
        const size = parseFloat(getComputedStyle(node).fontSize);
        node.style.fontSize = `${(size * node.clientWidth * 0.99) / node.scrollWidth}px`;
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(node);
    // The Quran font loads on first use, after the first check.
    document.fonts?.addEventListener('loadingdone', check);
    return {
      destroy: () => {
        ro.disconnect();
        document.fonts?.removeEventListener('loadingdone', check);
      },
    };
  }
</script>

{#if d}
  <div class="pages" lang="ar" dir="rtl">
    {#each d.pages as page (page.n)}
      <section class="page" aria-label={`Page ${page.n}`}>
        {#each page.lines as line, k (k)}
          {#if line.kind === 'surah'}
            <p class="sname" class:other={line.surah !== surah}>سُورَةُ {line.name}</p>
          {:else if line.kind === 'bismillah'}
            <p class="line centered bism" use:fit>{BISMILLAH}</p>
          {:else}
            <p class="line" class:centered={line.centered} class:other={line.surah !== surah} use:fit>
              {#each line.words as w, j (j)}
                {#if w.marker}
                  <a class="marker" href={hrefFor(`${line.surah}:${w.ayah}`)} aria-label={`Verse ${line.surah}:${w.ayah}`}>{ayahMarker(w.ayah)}</a>
                {:else}
                  <span
                    id={w.first ? `ayah-${line.surah}-${w.ayah}` : undefined}
                    class:target={line.surah === surah && scrollTo === w.ayah}>{w.text}</span
                  >
                {/if}
              {/each}
            </p>
          {/if}
        {/each}
        <p class="pno" dir="ltr">{page.n}</p>
      </section>
    {/each}
  </div>
{:else if failed}
  <p class="note">Couldn't load the mushaf pages.</p>
{:else}
  <p class="note">Loading the pages…</p>
{/if}

<style>
  .pages {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-4);
    justify-items: center;
  }
  .page {
    container-type: inline-size;
    width: min(100%, 34rem);
    padding: var(--space-4) var(--space-3) var(--space-2);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    font-family: var(--font-quran);
  }
  @media (max-width: 480px) {
    .page {
      padding-inline: var(--space-2);
    }
  }
  p {
    margin: 0;
  }
  .line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.2em;
    white-space: nowrap;
    /* Sized so about 95% of lines fit as they are (measured across Al-Baqarah); fit() shrinks the rest. */
    font-size: 4.9cqi;
    line-height: 2.05;
    font-feature-settings: 'calt', 'liga';
  }
  .line.centered {
    justify-content: center;
    gap: 0.3em;
  }
  .sname {
    margin: var(--space-1) 0;
    padding: 0.15em 0;
    text-align: center;
    font-size: 5.2cqi;
    line-height: 1.8;
    color: var(--accent);
    border-block: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  }
  .other {
    opacity: 0.4;
  }
  .marker {
    color: var(--accent);
    text-decoration: none;
  }
  .target {
    background: var(--accent-soft);
    border-radius: 4px;
  }
  .pno {
    margin-top: var(--space-2);
    text-align: center;
    color: var(--ink-2);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }
  .note {
    margin-top: var(--space-4);
    color: var(--ink-2);
    text-align: center;
  }
</style>
