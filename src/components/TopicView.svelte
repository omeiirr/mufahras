<script lang="ts">
  import Tag from '@lucide/svelte/icons/tag';
  import type { TopicDetail } from '../lib/data/views';
  import TopicTree from './TopicTree.svelte';

  let { d, hrefFor }: { d: TopicDetail; hrefFor: (path: string) => string } = $props();
</script>

<article class="topic">
  <header>
    <p class="kind"><Tag size={16} aria-hidden="true" /> Topic</p>
    <h1>{d.name}</h1>
    {#if d.nameAr}<p class="ar" lang="ar" dir="rtl">{d.nameAr}</p>{/if}
    {#if d.description}<p class="desc">{d.description}</p>{/if}
    <p class="count">
      {#if d.total}{d.total} {d.total === 1 ? 'ayah' : 'ayahs'}{#if d.totalWithin > d.total}, {d.totalWithin} with its subtopics{/if}
      {:else}{d.totalWithin} {d.totalWithin === 1 ? 'ayah' : 'ayahs'} in its subtopics{/if}
    </p>
  </header>

  {#if d.paths.length}
    <nav class="links" aria-label="Part of">
      <span class="lbl">Part of</span>
      {#each d.paths as path (path.map((t) => t.id).join('/'))}
        <p class="path">
          {#each path as t, k (t.id)}{#if k}<span class="sep" aria-hidden="true">›</span>{/if}<a href={hrefFor(`topic/${t.id}`)}>{t.name}</a>{/each}
        </p>
      {/each}
    </nav>
  {/if}

  {#if d.children.length}
    <section class="includes" aria-labelledby="includes-h">
      <h2 id="includes-h" class="lbl">Includes</h2>
      <TopicTree nodes={d.children} {hrefFor} label={`Subtopics of ${d.name}`} />
    </section>
  {/if}

  {#if d.related.length}
    <nav class="links" aria-label="Related topics">
      <p>
        <span class="lbl">Related</span>
        {#each d.related as t (t.id)}<a href={hrefFor(`topic/${t.id}`)}>{t.name}</a>{/each}
      </p>
    </nav>
  {/if}

  {#if d.ayahs.length}
  <ol class="ayahs">
    {#each d.ayahs as a (`${a.surah}:${a.ayah}`)}
      <li>
        <a href={hrefFor(`${a.surah}:${a.ayah}`)}>
          <span class="ref">{a.surah}:{a.ayah} <span class="sub">{a.name}</span></span>
          <span class="en">{a.en}</span>
        </a>
      </li>
    {/each}
  </ol>
  {/if}
  {#if d.total > d.ayahs.length}<p class="sub">Showing the first {d.ayahs.length} of {d.total}.</p>{/if}
  <p class="credit">Topics from the Quranic Universal Library (QUL).</p>
</article>

<style>
  .topic {
    display: grid;
    gap: var(--space-4);
  }
  .kind {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .ar {
    margin: 0;
    font-family: var(--font-arabic);
    font-size: var(--text-xl);
    text-align: left;
  }
  .desc {
    margin: var(--space-2) 0 0;
    line-height: 1.6;
  }
  .count,
  .sub,
  .credit {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .credit {
    font-size: var(--text-xs);
  }
  .links p {
    margin: 0 0 var(--space-2);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    align-items: baseline;
    font-size: var(--text-sm);
  }
  .lbl {
    color: var(--ink-2);
    font-weight: 600;
  }
  nav.links[aria-label='Part of'] {
    display: grid;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }
  .path {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    align-items: baseline;
  }
  .sep {
    color: var(--ink-2);
  }
  .includes {
    display: grid;
    gap: var(--space-1);
  }
  h2.lbl {
    margin: 0;
    font-size: var(--text-sm);
  }
  .links a {
    text-decoration: none;
  }
  .ayahs {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .ayahs a {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
  }
  .ayahs a:hover {
    background: var(--surface-2);
  }
  .ref {
    font-weight: 600;
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .en {
    line-height: 1.6;
  }
</style>
