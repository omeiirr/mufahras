<script lang="ts">
  // Verse of the day on the start screen. The date (local) picks the verse; see SearchEngine.dailyIndex.
  import type { AyahDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';
  import { ayahMarker } from '../lib/ui/format';

  let { client, hrefFor }: { client: SearchClient; hrefFor: (path: string) => string } = $props();

  const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  let verse = $state<AyahDetail | null>(null);

  $effect(() => {
    client.detail({ kind: 'daily', date: today() }).then((d) => {
      if (d?.kind === 'ayah') verse = d;
    });
  });

  const ref = $derived(verse ? `${verse.surah.n}:${verse.ayah}` : '');
</script>

{#if verse}
  <a class="daily" href={hrefFor(ref)} aria-label={`Verse of the day, ${ref} ${verse.surah.nameSimple}`}>
    <span class="label">Verse of the day</span>
    <span class="quran" lang="ar" dir="rtl">{verse.ar} <span class="marker">{ayahMarker(verse.ayah)}</span></span>
    <span class="en">{verse.en}</span>
    <span class="ref">{ref} · {verse.surah.nameSimple}</span>
  </a>
{/if}

<style>
  .daily {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    margin-bottom: var(--space-5);
    border-radius: var(--radius);
    background: var(--accent-soft);
    color: var(--ink);
    text-decoration: none;
    transition: filter var(--dur) var(--ease);
  }
  .daily:hover {
    filter: brightness(0.98);
  }
  .label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
  }
  .quran {
    font-size: 1.5rem;
    line-height: 2;
  }
  .marker {
    color: var(--accent);
  }
  .en {
    line-height: 1.6;
  }
  .ref {
    font-size: var(--text-sm);
    color: var(--accent);
    font-weight: 600;
  }
</style>
