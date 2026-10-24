<script lang="ts">
  // A titled list of ayahs: the duas of the Quran, or the sajdah verses.
  import type { AyahListDetail } from '../lib/data/views';
  import { ayahMarker } from '../lib/ui/format';

  let { d, hrefFor }: { d: AyahListDetail; hrefFor: (path: string) => string } = $props();

  const INFO = {
    duas: { title: 'Duas of the Quran', intro: 'Supplications from the Quran: the duas of the prophets and the believers, in the order they appear.' },
    sajdah: { title: 'Sajdah verses', intro: 'The verses of prostration (۩). On reciting or hearing one, a prostration (sajdat at-tilawah) is made.' },
  } as const;
</script>

<section class="page">
  <h1>{INFO[d.list].title}</h1>
  <p class="sub">{INFO[d.list].intro} {d.ayahs.length} verses.</p>
  <ol class="list">
    {#each d.ayahs as a (`${a.surah}:${a.ayah}`)}
      <li>
        <a href={hrefFor(`${a.surah}:${a.ayah}`)}>
          <span class="ref">{a.surah}:{a.ayah} <span class="sub">{a.name}</span></span>
          <span class="quran" lang="ar" dir="rtl">{a.ar} <span class="marker">{ayahMarker(a.ayah)}</span></span>
          <span class="en">{a.en}</span>
        </a>
      </li>
    {/each}
  </ol>
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
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
  }
  .list a:hover {
    background: var(--surface-2);
  }
  .ref {
    font-weight: 600;
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .quran {
    font-size: calc(1.45rem * var(--arabic-scale, 1));
    line-height: 2;
  }
  .marker {
    color: var(--accent);
  }
  .en {
    line-height: 1.6;
  }
</style>
