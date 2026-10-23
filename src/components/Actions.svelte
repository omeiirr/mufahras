<script lang="ts">
  // Copy and share for a verse or hadith. Share uses the system sheet where available.
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';
  import Share2 from '@lucide/svelte/icons/share-2';

  let { text, title }: { text: string; title: string } = $props();

  let copied = $state(false);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text, url: location.href });
    } catch {
      // dismissed
    }
  }
</script>

<div class="actions">
  <button type="button" onclick={copy} aria-live="polite">
    {#if copied}<Check size={18} aria-hidden="true" /> Copied{:else}<Copy size={18} aria-hidden="true" /> Copy{/if}
  </button>
  {#if canShare}
    <button type="button" onclick={share}><Share2 size={18} aria-hidden="true" /> Share</button>
  {/if}
</div>

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
</style>
