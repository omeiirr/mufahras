<script lang="ts">
  // Well-known names: the aliases search understands ("ayatul kursi" → 2:255), as a browsable list.
  import { BOOKS } from '../lib/data/books';
  import { ALIASES, type Alias } from '../lib/search/aliases';

  let { hrefFor }: { hrefFor: (path: string) => string } = $props();

  const pathOf = (a: Alias) => {
    const t = a.target;
    return t.kind === 'hadith' ? `${t.book}/${t.number}` : t.kind === 'surah' ? `surah/${t.surah}` : `${t.surah}:${t.ayah}`;
  };
  const refOf = (a: Alias) => {
    const t = a.target;
    if (t.kind === 'hadith') return `${BOOKS[t.book].short} ${t.number}`;
    if (t.kind === 'surah') return `Surah ${t.surah}`;
    return t.ayahTo ? `${t.surah}:${t.ayah}–${t.ayahTo}` : `${t.surah}:${t.ayah}`;
  };
  const groups: [string, Alias[]][] = [
    ['Verses', ALIASES.filter((a) => a.target.kind === 'ayah')],
    ['Surahs', ALIASES.filter((a) => a.target.kind === 'surah')],
    ['Hadith', ALIASES.filter((a) => a.target.kind === 'hadith')],
  ];
</script>

<section class="page">
  <h1>Well-known names</h1>
  <p class="sub">Names people use for verses, surahs and hadith. Type any of them in the search, in most common spellings.</p>
  {#each groups as [title, list] (title)}
    <h2>{title}</h2>
    <ul class="list">
      {#each list as a (a.name)}
        <li>
          <a href={hrefFor(pathOf(a))}>
            <span class="name">{a.name}</span>
            <span class="ref">{refOf(a)}</span>
            <span class="also">{a.spellings.slice(0, 3).join(' · ')}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/each}
</section>

<style>
  .page {
    display: grid;
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  h2 {
    margin: var(--space-3) 0 0;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .sub {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list a {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px var(--space-3);
    padding: var(--space-2);
    border-bottom: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
  }
  .list a:hover {
    background: var(--surface-2);
  }
  .name {
    font-weight: 600;
  }
  .ref {
    color: var(--accent);
    font-weight: 600;
    font-size: var(--text-sm);
  }
  .also {
    grid-column: 1 / -1;
    color: var(--ink-2);
    font-size: var(--text-xs);
    overflow-wrap: anywhere;
  }
</style>
