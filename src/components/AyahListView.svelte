<script lang="ts">
  // A titled list of ayahs: the duas of the Quran, the sajdah verses, or the verses mentioned in hadith.
  // The Arabic is tappable word by word, so the reference and the translation are the links to the verse.
  import type { AyahListDetail } from '../lib/data/views';
  import type { SearchClient } from '../lib/search/client';
  import { addShortcuts, openWords, stepFocus } from '../lib/ui/keys';
  import VerseWords from './VerseWords.svelte';
  import { radiogroup } from '../lib/ui/focus';

  let { d, hrefFor, client }: { d: AyahListDetail; hrefFor: (path: string) => string; client: SearchClient } = $props();

  const INFO = {
    duas: { title: 'Duas of the Quran', intro: 'Supplications from the Quran: the duas of the prophets and the believers, in the order they appear.' },
    sajdah: { title: 'Sajdah verses', intro: 'The verses of prostration (۩). On reciting or hearing one, a prostration (sajdat at-tilawah) is made.' },
    'in-hadith': {
      title: 'Verses in the hadith',
      intro: 'Verses that the six hadith collections quote in Arabic or cite by number. Open one to read the hadith.',
    },
  } as const;

  $effect(() =>
    addShortcuts('This list', 1, () => [
      { keys: ['j'], label: 'Next verse', run: () => stepFocus('.list a.ref', 1) },
      { keys: ['k'], label: 'Previous verse', run: () => stepFocus('.list a.ref', -1) },
      { keys: ['w'], label: 'Word by word', run: () => openWords('.list > li') },
    ]),
  );

  type Ayah = AyahListDetail['ayahs'][number];
  let mostFirst = $state(false);
  /** In Quran order, a heading per surah; most mentioned first, one list. */
  const groups = $derived.by((): { name: string; ayahs: Ayah[] }[] => {
    if (d.list !== 'in-hadith') return [{ name: '', ayahs: d.ayahs }];
    if (mostFirst) return [{ name: '', ayahs: [...d.ayahs].sort((a, b) => b.count! - a.count! || a.surah - b.surah || a.ayah - b.ayah) }];
    const out: { name: string; ayahs: Ayah[] }[] = [];
    for (const a of d.ayahs) {
      const name = `${a.surah}. ${a.name}`;
      if (out.at(-1)?.name !== name) out.push({ name, ayahs: [] });
      out.at(-1)!.ayahs.push(a);
    }
    return out;
  });
</script>

<section class="page">
  <h1>{INFO[d.list].title}</h1>
  <p class="sub">{INFO[d.list].intro} {d.ayahs.length} verses.</p>
  {#if d.list === 'in-hadith'}
    <div class="seg" role="radiogroup" use:radiogroup aria-label="Order">
      {#each [[false, 'In Quran order'], [true, 'Most mentioned']] as const as [on, label] (label)}
        <button type="button" role="radio" aria-checked={mostFirst === on} class:on={mostFirst === on} onclick={() => (mostFirst = on)}>{label}</button>
      {/each}
    </div>
  {/if}
  {#each groups as g (g.name)}
    {#if g.name}<h2 class="surah">{g.name}</h2>{/if}
    <ol class="list">
      {#each g.ayahs as a (`${a.surah}:${a.ayah}`)}
        <li>
          <a class="ref" href={hrefFor(`${a.surah}:${a.ayah}`)}
            >{a.surah}:{a.ayah} <span class="sub">{a.name}</span>{#if a.count}<span class="count">In {a.count} hadith</span>{/if}</a
          >
          <VerseWords ar={a.ar} surah={a.surah} ayah={a.ayah} {client} class="ar" />
          <a class="en" href={hrefFor(`${a.surah}:${a.ayah}`)}>{a.en}</a>
        </li>
      {/each}
    </ol>
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
  .list li {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .list a {
    color: inherit;
    text-decoration: none;
  }
  .list a:hover {
    text-decoration: underline;
    text-decoration-color: var(--line);
  }
  .list .ref {
    font-weight: 600;
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .list :global(.ar) {
    margin: 0;
    font-size: calc(1.45rem * var(--arabic-scale, 1));
    line-height: 2;
  }
  .en {
    line-height: 1.6;
  }
  .count {
    float: right;
    color: var(--ink-2);
    font-weight: 500;
  }
  h2.surah {
    margin: var(--space-3) 0 0;
    font-size: var(--text-lg);
  }
  .seg {
    justify-self: start;
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--surface-2);
    border-radius: 99px;
  }
  .seg button {
    min-height: 36px;
    padding: 0 var(--space-4);
    border-radius: 99px;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
</style>
