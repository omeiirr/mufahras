<script lang="ts">
  // Offline storage status with a one-tap "download everything". Shown on the start screen.
  import Check from '@lucide/svelte/icons/check';
  import Download from '@lucide/svelte/icons/download';
  import type { SearchClient } from '../lib/search/client';
  import type { OfflineStatus } from '../lib/search/worker';

  let { client, ready }: { client: SearchClient; ready: boolean } = $props();

  let status = $state<OfflineStatus | null>(null);
  let downloading = $state(false);
  let error = $state('');

  const refresh = () => client.offline().then((s) => (status = s));
  $effect(() => {
    void ready; // recheck once the hadith have loaded (and been stored)
    void refresh();
    // The service worker takes control after its first install; recheck then.
    navigator.serviceWorker?.addEventListener('controllerchange', refresh);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', refresh);
  });

  async function download() {
    downloading = true;
    error = '';
    // Ask the browser not to evict the data under storage pressure (granted silently or not at all).
    await navigator.storage?.persist?.().catch(() => false);
    status = await client.offline(true);
    downloading = false;
    if (status.cached < status.total) error = 'Some files could not be downloaded. Check the connection and try again.';
  }

  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
</script>

{#if status?.supported}
  <section class="offline" aria-live="polite">
    {#if status.cached === status.total}
      <p><Check size={18} aria-hidden="true" /> Everything is available offline.</p>
    {:else}
      <p>The Quran and hadith English work offline after loading. Download the rest ({mb(status.missingBytes)}, mostly hadith Arabic) to have everything offline.</p>
      <button type="button" onclick={download} disabled={downloading}>
        <Download size={18} aria-hidden="true" />
        {downloading ? 'Downloading…' : `Download ${mb(status.missingBytes)}`}
      </button>
      {#if error}<p class="error">{error}</p>{/if}
    {/if}
  </section>
{/if}

<style>
  .offline {
    margin-top: var(--space-5);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: var(--text-sm);
    color: var(--ink-2);
    display: grid;
    gap: var(--space-2);
  }
  p {
    margin: 0;
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  button {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-4);
    border-radius: 99px;
    border: 1px solid var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .error {
    color: var(--daif);
  }
</style>
