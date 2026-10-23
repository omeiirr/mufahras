<script lang="ts">
  // Hadith of the day on the start screen; see SearchEngine.dailyHadith for how it's chosen.
  import type { HadithDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';

  let { client, hrefFor }: { client: SearchClient; hrefFor: (path: string) => string } = $props();

  let h = $state<HadithDetail | null>(null);
  $effect(() => {
    client.detail({ kind: 'hadith-daily', date: new Date().toLocaleDateString('en-CA') }).then((d) => {
      if (d?.kind === 'hadith') h = d;
    });
  });
</script>

{#if h}
  <a class="daily" href={hrefFor(`${h.book}/${h.number}`)} aria-label={`Hadith of the day, ${h.short} ${h.number}`}>
    <span class="label">Hadith of the day</span>
    <span class="en">{h.en}</span>
    <span class="ref">{h.title} {h.number} · {h.section.name}</span>
  </a>
{/if}

<style>
  .daily {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    margin-bottom: var(--space-5);
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
  }
  .daily:hover {
    border-color: var(--accent);
  }
  .label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
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
