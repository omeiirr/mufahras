<script lang="ts">
  // Preview and share a verse or hadith as an image. Shares the PNG through the system sheet where the
  // browser supports sharing files, otherwise downloads it.
  import Download from '@lucide/svelte/icons/download';
  import Share2 from '@lucide/svelte/icons/share-2';
  import X from '@lucide/svelte/icons/x';
  import { canvasToFile, renderCard, type CardContent, type CardShape, type CardStyle } from '../lib/card/render';

  let { content, onclose }: { content: CardContent; onclose: () => void } = $props();

  let style = $state<CardStyle>(document.documentElement.dataset.theme === 'night' || document.documentElement.dataset.theme === 'dusk' ? 'dark' : 'light');
  let shape = $state<CardShape>('square');
  let url = $state('');
  let file = $state<File | null>(null);
  let busy = $state(false);
  let closeButton = $state<HTMLButtonElement>();

  const name = $derived(`mufahras-${content.ref.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);

  $effect(() => {
    const [st, sh] = [style, shape];
    let current = true;
    busy = true;
    renderCard(content, st, sh)
      .then((canvas) => canvasToFile(canvas, name))
      .then((f) => {
        if (!current) return;
        file = f;
        URL.revokeObjectURL(url);
        url = URL.createObjectURL(f);
        busy = false;
      });
    return () => (current = false);
  });
  $effect(() => closeButton?.focus());

  const canShareFiles = $derived(!!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: content.ref });
    } catch {
      // dismissed
    }
  }

  function download() {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="scrim" onclick={onclose} aria-hidden="true"></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label="Share as image" data-modal>
  <div class="head">
    <strong>Share as image</strong>
    <button type="button" class="icon" bind:this={closeButton} onclick={onclose} aria-label="Close"><X size={20} aria-hidden="true" /></button>
  </div>
  <div class="preview" class:story={shape === 'story'}>
    {#if url}<img src={url} alt={`Image of ${content.ref}`} class:busy />{/if}
  </div>
  <div class="opts">
    <div class="seg" role="radiogroup" aria-label="Style">
      <button type="button" role="radio" aria-checked={style === 'light'} class:on={style === 'light'} onclick={() => (style = 'light')}>Light</button>
      <button type="button" role="radio" aria-checked={style === 'dark'} class:on={style === 'dark'} onclick={() => (style = 'dark')}>Dark</button>
    </div>
    <div class="seg" role="radiogroup" aria-label="Shape">
      <button type="button" role="radio" aria-checked={shape === 'square'} class:on={shape === 'square'} onclick={() => (shape = 'square')}>Square</button>
      <button type="button" role="radio" aria-checked={shape === 'story'} class:on={shape === 'story'} onclick={() => (shape = 'story')}>Story</button>
    </div>
  </div>
  <div class="actions">
    {#if canShareFiles}<button type="button" class="primary" onclick={share} disabled={busy}><Share2 size={18} aria-hidden="true" /> Share</button>{/if}
    <button type="button" class:primary={!canShareFiles} onclick={download} disabled={busy || !url}><Download size={18} aria-hidden="true" /> Download</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.45);
  }
  .sheet {
    position: fixed;
    z-index: 41;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: min(520px, 100%);
    max-height: 92dvh;
    overflow-y: auto;
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) calc(env(safe-area-inset-bottom) + var(--space-4));
    background: var(--bg);
    border-radius: var(--radius) var(--radius) 0 0;
    box-shadow: var(--shadow);
  }
  /* On a wide screen it opens as a centred dialog; on a phone it stays a bottom sheet. */
  @media (min-width: 1024px) {
    .sheet {
      top: 50%;
      bottom: auto;
      transform: translate(-50%, -50%);
      max-height: 90dvh;
      padding-bottom: var(--space-4);
      border-radius: var(--radius);
    }
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .preview {
    display: grid;
    place-items: center;
  }
  .preview img {
    width: min(100%, 340px);
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    transition: opacity var(--dur) var(--ease);
  }
  .preview.story img {
    width: min(62%, 240px);
  }
  img.busy {
    opacity: 0.5;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
  }
  .seg {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--surface-2);
    border-radius: 99px;
  }
  .seg button {
    min-height: 40px;
    padding: 0 var(--space-4);
    border-radius: 99px;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--tap);
    padding: 0 var(--space-5);
    border-radius: 99px;
    border: 1px solid var(--line);
    font-weight: 600;
  }
  .actions .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .actions button:disabled {
    opacity: 0.6;
  }
  .icon {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
  }
</style>
