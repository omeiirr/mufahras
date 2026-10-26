<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import Tag from '@lucide/svelte/icons/tag';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Upload from '@lucide/svelte/icons/upload';
  import { allTags, bookmarks, exportBookmarks, importBookmarks, removeBookmark, setTags } from '../lib/store/bookmarks.svelte';
  import { radiogroup } from '../lib/ui/focus';

  let { hrefFor }: { hrefFor: (path: string) => string } = $props();

  let tag = $state<string | null>(null);
  let editing = $state<string | null>(null);
  let draft = $state('');
  let message = $state('');
  let fileInput = $state<HTMLInputElement>();

  const tags = $derived(allTags());
  const shown = $derived(tag ? bookmarks.list.filter((b) => b.tags.includes(tag!)) : bookmarks.list);

  function addTag(path: string, current: string[]) {
    const t = draft.trim();
    if (t) void setTags(path, [...current, ...t.split(',')]);
    draft = '';
    editing = null;
  }

  async function onImport(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      message = `Imported ${await importBookmarks(file)} bookmarks.`;
    } catch (err) {
      message = (err as Error).message || "That file couldn't be read.";
    }
    (e.currentTarget as HTMLInputElement).value = '';
  }
</script>

<section class="page">
  <h1>Bookmarks</h1>
  <p class="sub">Saved on this device only. Export them to keep a backup or move them to another device.</p>
  {#if bookmarks.error}<p class="error" role="alert">{bookmarks.error}</p>{/if}

  <div class="tools">
    <button type="button" onclick={exportBookmarks} disabled={!bookmarks.list.length}><Download size={16} aria-hidden="true" /> Export</button>
    <button type="button" onclick={() => fileInput?.click()}><Upload size={16} aria-hidden="true" /> Import</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onImport} hidden />
  </div>
  {#if message}<p class="sub" role="status">{message}</p>{/if}

  {#if tags.length}
    <div class="filter" role="radiogroup" use:radiogroup aria-label="Filter by tag">
      <button type="button" role="radio" aria-checked={tag === null} class:on={tag === null} onclick={() => (tag = null)}>All</button>
      {#each tags as t (t)}
        <button type="button" role="radio" aria-checked={tag === t} class:on={tag === t} onclick={() => (tag = t)}>{t}</button>
      {/each}
    </div>
  {/if}

  {#if !bookmarks.list.length}
    <p class="empty">Nothing saved yet. Open a verse or hadith and tap <strong>Save</strong>.</p>
  {/if}

  <ul class="list">
    {#each shown as b (b.path)}
      <li>
        <a href={hrefFor(b.path)}>
          <span class="ref">{b.label} <span class="sub">{b.sublabel}</span></span>
          <span class="text">{b.text}</span>
        </a>
        <div class="meta">
          {#each b.tags as t (t)}
            <button type="button" class="tag" onclick={() => setTags(b.path, b.tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>{t} ×</button>
          {/each}
          {#if editing === b.path}
            <form onsubmit={(e) => (e.preventDefault(), addTag(b.path, b.tags))}>
              <!-- svelte-ignore a11y_autofocus -->
              <input bind:value={draft} placeholder="tag, another" aria-label="New tags" autofocus onblur={() => addTag(b.path, b.tags)} />
            </form>
          {:else}
            <button type="button" class="add" onclick={() => ((editing = b.path), (draft = ''))}><Tag size={14} aria-hidden="true" /> Add tag</button>
          {/if}
          <button type="button" class="remove" onclick={() => removeBookmark(b.path)} aria-label={`Remove ${b.label}`}><Trash2 size={16} aria-hidden="true" /></button>
        </div>
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
  .sub,
  .empty {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .error {
    margin: 0;
    color: var(--daif);
  }
  .tools,
  .filter {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .tools button,
  .filter button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 var(--space-3);
    border: 1px solid var(--line);
    border-radius: 99px;
    font-size: var(--text-sm);
  }
  .tools button:disabled {
    opacity: 0.5;
  }
  .filter button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .list li {
    border-bottom: 1px solid var(--line);
    padding: var(--space-2) 0;
  }
  .list a {
    display: grid;
    gap: 2px;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
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
  .text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
    padding: 0 var(--space-2);
  }
  .tag,
  .add {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 0 var(--space-2);
    border-radius: 99px;
    font-size: var(--text-xs);
  }
  .tag {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .add {
    color: var(--ink-2);
  }
  .meta input {
    min-height: 32px;
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
    font-size: var(--text-sm);
  }
  .remove {
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--ink-2);
  }
  .remove:hover {
    background: var(--surface-2);
    color: var(--daif);
  }
</style>
