<script lang="ts">
  // Copy, share, save (bookmark) and share-as-image for a verse or hadith.
  // Share uses the system sheet where available.
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';
  import ImageIcon from '@lucide/svelte/icons/image';
  import Share2 from '@lucide/svelte/icons/share-2';
  import type { CardContent } from '../lib/card/render';
  import { bookmarks, isBookmarked, toggleBookmark, type Bookmark as BookmarkRecord } from '../lib/store/bookmarks.svelte';
  import { settings } from '../lib/store/settings.svelte';
  import { closeLayer, openLayer } from '../lib/back.svelte';
  import { addShortcuts } from '../lib/ui/keys';
  import CardSheet from './CardSheet.svelte';

  let {
    text,
    title,
    bookmark,
    card,
  }: { text: string; title: string; bookmark: Omit<BookmarkRecord, 'tags' | 'created'>; card: CardContent } = $props();

  let copied = $state(false);
  let cardOpen = $state(false);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const saved = $derived(bookmarks.list.length >= 0 && isBookmarked(bookmark.path));

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  function openCard() {
    cardOpen = true;
    openLayer('card', () => (cardOpen = false));
  }

  $effect(() =>
    addShortcuts(bookmark.kind === 'ayah' ? 'This verse' : 'This hadith', 1, () => [
      { keys: ['b'], label: saved ? 'Remove the bookmark' : 'Bookmark', run: () => toggleBookmark(bookmark) },
      { keys: ['c'], label: 'Copy, with the reference', run: copy },
      { keys: ['i'], label: 'Share as an image', when: () => !settings.sakinah, run: openCard },
    ]),
  );

  async function share() {
    try {
      await navigator.share({ title, text, url: location.href });
    } catch {
      // dismissed
    }
  }
</script>

<div class="actions">
  <button type="button" onclick={() => toggleBookmark(bookmark)} aria-pressed={saved} class:on={saved}>
    {#if saved}<BookmarkCheck size={18} aria-hidden="true" /> Saved{:else}<Bookmark size={18} aria-hidden="true" /> Save{/if}
  </button>
  <button type="button" onclick={copy} aria-live="polite">
    {#if copied}<Check size={18} aria-hidden="true" /> Copied{:else}<Copy size={18} aria-hidden="true" /> Copy{/if}
  </button>
  {#if canShare}
    <button type="button" onclick={share}><Share2 size={18} aria-hidden="true" /> Share</button>
  {/if}
  {#if !settings.sakinah}
    <button type="button" onclick={openCard}><ImageIcon size={18} aria-hidden="true" /> Image</button>
  {/if}
</div>

{#if cardOpen}
  <CardSheet
    content={card}
    onclose={() => {
      cardOpen = false;
      closeLayer('card');
    }}
  />
{/if}

<style>
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border: 1px solid var(--line);
    border-radius: 99px;
    color: var(--ink);
    font-size: var(--text-sm);
    transition: background var(--dur) var(--ease);
  }
  button:hover {
    background: var(--surface-2);
  }
  button:active {
    background: var(--line);
  }
  button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
</style>
