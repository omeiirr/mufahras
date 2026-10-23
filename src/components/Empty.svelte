<script lang="ts">
  // Shown before typing: examples that demonstrate what the search understands.
  import BookOpen from '@lucide/svelte/icons/book-open';

  let { onpick, onbrowse }: { onpick: (q: string) => void; onbrowse: () => void } = $props();

  const examples: [string, string][] = [
    ['patience prayer', 'words, in any order'],
    ['patiance', 'typos are fine'],
    ['2:255', 'go to a verse'],
    ['baqarah 255', 'surah names'],
    ['bukhari 1', 'hadith numbers'],
    ['qul huwa allahu ahad', 'transliteration'],
    ['الحمد لله رب العالمين', 'Arabic, no diacritics needed'],
  ];
</script>

<section class="empty" aria-label="Examples">
  <h1>Find any verse or hadith</h1>
  <p class="lede">The Quran and the six major hadith collections, searchable as you type. Works offline once loaded.</p>
  <ul>
    {#each examples as [q, note] (q)}
      <li>
        <button type="button" onclick={() => onpick(q)}>
          <span class="q" dir="auto">{q}</span>
          <span class="note">{note}</span>
        </button>
      </li>
    {/each}
  </ul>
  <button type="button" class="browse" onclick={onbrowse}><BookOpen size={18} aria-hidden="true" /> Browse surahs</button>
</section>

<style>
  .empty {
    padding: var(--space-5) var(--space-4);
    max-width: var(--measure);
  }
  h1 {
    font-size: var(--text-xl);
    margin: 0 0 var(--space-2);
    letter-spacing: -0.01em;
  }
  .lede {
    color: var(--ink-2);
    margin: 0 0 var(--space-5);
  }
  ul {
    list-style: none;
    margin: 0 0 var(--space-5);
    padding: 0;
    display: grid;
    gap: var(--space-1);
  }
  li button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
    min-height: var(--tap);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;
  }
  li button:hover {
    background: var(--surface-2);
  }
  .q {
    font-weight: 500;
    white-space: nowrap;
  }
  .note {
    color: var(--ink-2);
    font-size: var(--text-sm);
    text-align: right;
  }
  .browse {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border-radius: 99px;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }
</style>
