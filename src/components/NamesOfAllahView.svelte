<script lang="ts">
  // The 99 Names of Allah, with the hadith about them and a link to search each name in the Quran.
  import type { NamesOfAllahDetail } from '../lib/data/views';

  let { d, hrefFor }: { d: NamesOfAllahDetail; hrefFor: (path: string) => string } = $props();

  let filter = $state('');
  const shown = $derived.by(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return d.names;
    return d.names.filter((n) => [n.translit, n.en, n.meaning, n.ar].some((x) => x.toLowerCase().includes(f)) || String(n.number) === f);
  });
  // The Quran search for a name: its Arabic as written, which search normalizes.
  const search = (ar: string) => `#/?q=${encodeURIComponent(ar)}&in=quran`;
</script>

<section class="page">
  <p class="title-ar" lang="ar" dir="rtl">أَسْمَاءُ ٱللَّهِ ٱلْحُسْنَىٰ</p>
  <h1>The 99 Names of Allah</h1>
  <blockquote>
    “Allah has ninety-nine names, one hundred less one; whoever memorises them will enter Paradise.”
    <span class="cite">
      <a href={hrefFor('bukhari/7392')}>Bukhari 7392</a> · <a href={hrefFor('muslim/6809')}>Muslim 6809</a>
    </span>
  </blockquote>
  <p class="sub">
    This list follows the narration in <a href={hrefFor('tirmidhi/3507')}>Tirmidhi 3507</a>; scholars differ on whether the
    enumeration itself is from the Prophet ﷺ or was added by a narrator. Names and meanings from
    <a href="https://ummahapi.com/asma-ul-husna-api" target="_blank" rel="noopener">UmmahAPI</a>.
  </p>

  <label class="visually-hidden" for="names-filter">Filter names</label>
  <input id="names-filter" class="filter" bind:value={filter} placeholder="Filter: merciful, Al-Wadud, 17…" autocomplete="off" />

  <ol class="names">
    {#each shown as n (n.number)}
      <li>
        <span class="num">{n.number}</span>
        <div class="body">
          <p class="ar" lang="ar" dir="rtl">{n.ar}</p>
          <p class="en"><span class="translit">{n.translit}</span> · <strong>{n.en}</strong></p>
          <p class="meaning">{n.meaning}</p>
          <a class="find" href={search(n.ar)}>Search the Quran</a>
        </div>
      </li>
    {/each}
  </ol>
  {#if !shown.length}<p class="sub">No name matches “{filter}”.</p>{/if}
</section>

<style>
  .page {
    display: grid;
    gap: var(--space-3);
  }
  .title-ar {
    margin: 0;
    font-family: var(--font-quran);
    font-size: calc(2rem * var(--arabic-scale, 1));
    color: var(--accent);
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
    text-align: center;
  }
  blockquote {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-left: 3px solid var(--accent);
    background: var(--surface);
    border-radius: var(--radius-sm);
    line-height: 1.6;
  }
  .cite {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--text-sm);
  }
  .sub {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .filter {
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
  }
  .names {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: var(--space-2);
  }
  .names li {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }
  .body {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .body p {
    margin: 0;
  }
  .ar {
    font-family: var(--font-quran);
    font-size: calc(1.7rem * var(--arabic-scale, 1));
    line-height: 1.7;
    text-align: left;
  }
  .translit {
    font-style: italic;
  }
  .meaning {
    color: var(--ink-2);
    font-size: var(--text-sm);
    line-height: 1.5;
  }
  .find {
    justify-self: start;
    margin-top: var(--space-1);
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: none;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
  }
</style>
