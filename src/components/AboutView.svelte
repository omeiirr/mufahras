<script lang="ts">
  // About and credits. Sources and data version come from the data manifest.
  import type { Manifest } from '../lib/data/types';

  let manifest = $state<Manifest | null>(null);
  $effect(() => {
    fetch(new URL('data/manifest.json', document.baseURI))
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => (manifest = m))
      .catch(() => {});
  });
  const built = $derived(manifest ? new Date(manifest.built).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
</script>

<article class="page">
  <h1>About Mufahras</h1>
  <p>
    <em>Mufahras</em> (مُفَهْرَس) means <em>indexed</em>, after <em>al-Muʿjam al-Mufahras</em>, the concordance generations used to
    find a verse from a word they remembered. Type what you remember, misspelled or out of order, in English, Arabic or
    transliteration, and find its source in the Quran and the six major hadith collections.
  </p>

  <h2>Private and offline</h2>
  <p>
    There are no accounts, no tracking and no ads. Searches run on your device and never leave it. Bookmarks, search history and
    settings are stored only on this device. After the first visit the app works without a connection.
  </p>

  <h2>A note on the texts</h2>
  <p>
    The translation and the hadith gradings are shown as they come from the sources below. A translation conveys meaning but is
    not the Quran itself, and gradings are the judgements of the scholars named beside them. For anything you act on, please
    confirm with people of knowledge.
  </p>

  <h2>Sources</h2>
  {#if manifest}
    <ul class="sources">
      {#each manifest.sources as s (s.name)}
        <li>
          <a href={s.url} target="_blank" rel="noopener">{s.name}</a>
          <span class="sub">{s.provider} · {s.license}</span>
        </li>
      {/each}
    </ul>
    <p class="sub">Data built {built}.</p>
  {/if}
  <p class="sub">
    Fonts: Scheherazade New (SIL), Noto Naskh Arabic, Amiri (logo). Icons: Lucide. Not affiliated with or endorsed by any of these
    sources; may Allah reward them for making this knowledge open.
  </p>

  <h2>Open source</h2>
  <p>
    The code is MIT licensed, at <a href="https://github.com/omeiirr/mufahras" target="_blank" rel="noopener">github.com/omeiirr/mufahras</a>.
    Found a mistake in a text, or a search that should have worked?
    <a href="https://github.com/omeiirr/mufahras/issues/new/choose" target="_blank" rel="noopener">Tell us</a>.
  </p>
  <p class="dua"><em>If it benefits you, please remember us in your duʿāʾ.</em></p>
</article>

<style>
  .page {
    display: grid;
    gap: var(--space-2);
    line-height: 1.65;
  }
  h1 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xl);
  }
  h2 {
    margin: var(--space-3) 0 0;
    font-size: var(--text-md);
  }
  p {
    margin: 0;
  }
  .sources {
    margin: 0;
    padding-left: 1.2em;
    display: grid;
    gap: var(--space-1);
  }
  .sources li {
    display: grid;
  }
  .sub {
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .dua {
    margin-top: var(--space-4);
    color: var(--ink-2);
    text-align: center;
  }
</style>
