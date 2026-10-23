<script lang="ts">
  import type { Manifest } from './lib/data/types';

  // Placeholder until milestone 3: confirms the generated data is served correctly.
  let manifest = $state<Manifest | null>(null);
  let error = $state('');

  fetch('data/manifest.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((m: Manifest) => (manifest = m))
    .catch((e: Error) => (error = `Could not load data/manifest.json (${e.message}). Run \`npm run data\`.`));
</script>

<main>
  <h1>Quran & Hadith Search</h1>
  {#if error}
    <p>{error}</p>
  {:else if manifest}
    <p>Data built {manifest.built}</p>
    <ul>
      {#each Object.entries(manifest.chunks) as [name, c] (name)}
        <li>{name}: {c.items.toLocaleString()} items, {(c.gzipBytes / 1024).toFixed(0)} KB gzipped</li>
      {/each}
    </ul>
  {:else}
    <p>Loading…</p>
  {/if}
</main>
