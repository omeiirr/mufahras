<script lang="ts">
  import type { SurahList } from '../lib/data/views';
  import { placeName } from '../lib/ui/format';

  let { d, hrefFor }: { d: SurahList; hrefFor: (path: string) => string } = $props();
</script>

<section>
  <h1>Surahs</h1>
  <ol class="grid">
    {#each d.surahs as s (s.n)}
      <li>
        <a href={hrefFor(`surah/${s.n}`)}>
          <span class="n">{s.n}</span>
          <span class="names">
            <span class="name">{s.nameSimple}</span>
            <span class="facts">{placeName(s.place)} · {s.count} ayahs</span>
          </span>
          <span class="ar" lang="ar" dir="rtl">{s.nameAr}</span>
        </a>
      </li>
    {/each}
  </ol>
</section>

<style>
  h1 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-xl);
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-1) var(--space-3);
  }
  a {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 56px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: inherit;
    text-decoration: none;
  }
  a:hover {
    background: var(--surface-2);
  }
  .n {
    color: var(--accent);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .names {
    display: grid;
  }
  .name {
    font-weight: 500;
  }
  .facts {
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
  .ar {
    font-family: var(--font-arabic);
    font-size: var(--text-lg);
  }
</style>
