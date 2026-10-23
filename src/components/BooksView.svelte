<script lang="ts">
  import type { BooksDetail } from '../lib/data/views';

  let { d, hrefFor }: { d: BooksDetail; hrefFor: (path: string) => string } = $props();
  let open = $state<string | null>(null);
</script>

<section class="page">
  <h1>Hadith collections</h1>
  <ul class="books">
    {#each d.books as b (b.id)}
      <li>
        <button type="button" class="book" aria-expanded={open === b.id} onclick={() => (open = open === b.id ? null : b.id)}>
          <span class="title">{b.title}</span>
          <span class="sub">{b.count.toLocaleString()} hadith · {b.sections.length} books</span>
        </button>
        {#if open === b.id}
          <ol class="sections">
            {#each b.sections as s (s.n)}
              <li>
                <a href={hrefFor(`${b.id}/book/${s.n}`)}><span class="n">{s.n}</span> <span class="name">{s.name}</span> <span class="sub">{s.count}</span></a>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ul>
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
  .books,
  .sections {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .books > li {
    border-bottom: 1px solid var(--line);
  }
  .book {
    width: 100%;
    display: grid;
    gap: 2px;
    padding: var(--space-3) var(--space-2);
    text-align: left;
  }
  .book:hover {
    background: var(--surface-2);
  }
  .title {
    font-weight: 600;
  }
  .sub {
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .sections {
    padding-bottom: var(--space-2);
  }
  .sections a {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto;
    gap: var(--space-2);
    align-items: baseline;
    min-height: 40px;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    color: inherit;
    text-decoration: none;
  }
  .sections a:hover {
    background: var(--surface-2);
  }
  .n {
    color: var(--accent);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
