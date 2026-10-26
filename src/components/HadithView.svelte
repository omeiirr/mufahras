<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import type { HadithDetail } from '../lib/data/views';
  import { addShortcuts, go } from '../lib/ui/keys';
  import Actions from './Actions.svelte';
  import GradeBadge from './GradeBadge.svelte';

  let { d, hrefFor }: { d: HadithDetail; hrefFor: (path: string) => string } = $props();

  const ref = $derived(`${d.title} ${d.number}`);
  const copyText = $derived(`${d.en}\n\n— ${ref}`);
  const bookmark = $derived({ path: `${d.book}/${d.number}`, kind: 'hadith' as const, label: `${d.short} ${d.number}`, sublabel: d.section.name, text: d.en.slice(0, 220) });
  // Cards carry the English; a hadith's Arabic includes its whole chain of narrators, too long for an image.
  const card = $derived({ ar: '', arFont: 'arabic' as const, en: d.en, ref, sub: d.section.name });

  $effect(() =>
    addShortcuts('This hadith', 1, () => [
      { keys: ['ArrowLeft'], label: 'Previous hadith', when: () => d.prev !== undefined, run: () => go(hrefFor(`${d.book}/${d.prev}`)) },
      { keys: ['ArrowRight'], label: 'Next hadith', when: () => d.next !== undefined, run: () => go(hrefFor(`${d.book}/${d.next}`)) },
    ]),
  );
</script>

<article class="hadith">
  <header>
    <h1>{d.short} {d.number}</h1>
    <p class="where">{d.title} · Book {d.section.n}: {d.section.name}</p>
    <div class="summary">
      {#if d.sahihCollection}
        <GradeBadge grade="sahih" label="Sahih (collection)" />
      {:else if d.grades.length}
        <GradeBadge grade={d.summary} />
      {:else}
        <GradeBadge grade="other" label="No grading" />
      {/if}
    </div>
  </header>

  <p class="en">{d.en}</p>
  {#if d.ar}<p class="arabic" lang="ar" dir="rtl">{d.ar}</p>{/if}

  {#if d.verses.length}
    <nav class="verses" aria-label="Verses in this hadith">
      <span class="lbl">Verses in this hadith</span>
      {#each d.verses as v (`${v.surah}:${v.ayah}`)}<a href={hrefFor(`${v.surah}:${v.ayah}`)} title={v.name}>{v.surah}:{v.ayah}</a>{/each}
    </nav>
  {/if}

  {#if d.grades.length}
    <section aria-labelledby="grades-h">
      <h2 id="grades-h">Gradings</h2>
      <table>
        <tbody>
          {#each d.grades as g (g.scholar)}
            <tr>
              <th scope="row">{g.scholar}</th>
              <td><GradeBadge grade={g.cls} label={g.grade} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else if d.sahihCollection}
    <p class="note">Every hadith in {d.title} is considered sahih; the collection has no per-hadith gradings.</p>
  {/if}

  <Actions text={copyText} title={ref} {bookmark} {card} />

  <nav class="pager" aria-label="Neighbouring hadith">
    {#if d.prev !== undefined}<a href={hrefFor(`${d.book}/${d.prev}`)}><ChevronLeft size={18} aria-hidden="true" /> {d.short} {d.prev}</a>{:else}<span></span>{/if}
    {#if d.next !== undefined}<a href={hrefFor(`${d.book}/${d.next}`)}>{d.short} {d.next} <ChevronRight size={18} aria-hidden="true" /></a>{/if}
  </nav>
</article>

<style>
  .hadith {
    display: grid;
    gap: var(--space-4);
  }
  h1 {
    margin: 0;
    font-size: var(--text-xl);
    color: var(--accent);
  }
  .where {
    margin: 0;
    color: var(--ink-2);
  }
  .summary {
    margin-top: var(--space-2);
  }
  .en {
    margin: 0;
    font-size: var(--text-lg);
    line-height: 1.7;
    white-space: pre-line;
  }
  .arabic {
    margin: 0;
    color: var(--ink);
  }
  h2 {
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
    margin: 0 0 var(--space-2);
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--line);
    font-size: var(--text-sm);
  }
  th {
    font-weight: 500;
    padding-right: var(--space-3);
  }
  td {
    text-align: right;
  }
  .note {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .verses {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    align-items: baseline;
    font-size: var(--text-sm);
  }
  .verses .lbl {
    color: var(--ink-2);
    font-weight: 600;
  }
  .verses a {
    font-weight: 600;
    text-decoration: none;
  }
  .pager {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--line);
    padding-top: var(--space-3);
  }
  .pager a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    text-decoration: none;
    font-weight: 500;
  }
</style>
