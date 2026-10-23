<script lang="ts">
  import Tag from '@lucide/svelte/icons/tag';
  import type { TopicDetail } from '../lib/data/views';

  let { d, hrefFor }: { d: TopicDetail; hrefFor: (path: string) => string } = $props();
</script>

<article class="topic">
  <header>
    <p class="kind"><Tag size={16} aria-hidden="true" /> Topic</p>
    <h1>{d.name}</h1>
    {#if d.nameAr}<p class="ar" lang="ar" dir="rtl">{d.nameAr}</p>{/if}
    {#if d.description}<p class="desc">{d.description}</p>{/if}
    <p class="count">{d.total} {d.total === 1 ? 'ayah' : 'ayahs'}</p>
  </header>

  {#if d.parents.length || d.children.length || d.related.length}
    <nav class="links" aria-label="Related topics">
      {#each [['Part of', d.parents], ['Includes', d.children], ['Related', d.related]] as const as [title, list] (title)}
        {#if list.length}
          <p>
            <span class="lbl">{title}</span>
            {#each list as t (t.id)}<a href={hrefFor(`topic/${t.id}`)}>{t.name}</a>{/each}
          </p>
        {/if}
      {/each}
    </nav>
  {/if}

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
