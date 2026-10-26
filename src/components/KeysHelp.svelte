<script lang="ts">
  // The keyboard shortcuts that work on the screen it was opened from (?), most specific first.
  import X from '@lucide/svelte/icons/x';
  import { trapFocus } from '../lib/ui/focus';
  import { shortcutHelp } from '../lib/ui/keys';

  let { onclose }: { onclose: () => void } = $props();

  // Read once, before this dialog's own keys take over.
  const groups = shortcutHelp();
  const anywhere = groups.findIndex((g) => g.name === 'Anywhere');
  const searchBox = {
    name: 'In the search box',
    keys: [
      { key: '↑ ↓', label: 'Choose a result' },
      { key: 'Enter', label: 'Open it, and move to it' },
      { key: 'Esc', label: 'Leave the search box' },
    ],
  };
  const shown = anywhere < 0 ? [...groups, searchBox] : [...groups.slice(0, anywhere), searchBox, ...groups.slice(anywhere)];

  let closeButton = $state<HTMLButtonElement>();
  $effect(() => closeButton?.focus());
</script>

<svelte:window onkeydown={(e) => (e.key === 'Escape' || e.key === '?') && (e.preventDefault(), onclose())} />

<div class="scrim" onclick={onclose} aria-hidden="true"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="keys-h" data-modal use:trapFocus>
  <div class="head">
    <h2 id="keys-h">Keyboard shortcuts</h2>
    <button type="button" class="icon" bind:this={closeButton} onclick={onclose} aria-label="Close"><X size={20} aria-hidden="true" /></button>
  </div>
  <p class="sub">What the keys do changes with the screen; these work here. Letter keys work when you're not typing in the search box: Enter on a result moves you out of it.</p>
  <div class="groups">
    {#each shown as g (g.name)}
      <section>
        <h3>{g.name}</h3>
        <dl>
          {#each g.keys as k (k.key)}
            <div><dt><kbd>{k.key}</kbd></dt><dd>{k.label}</dd></div>
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(0 0 0 / 0.45);
  }
  .dialog {
    position: fixed;
    z-index: 41;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(760px, calc(100% - 2 * var(--space-4)));
    max-height: 90dvh;
    overflow-y: auto;
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-4);
    background: var(--bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
  }
  .sub {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-sm);
  }
  /* Two columns where there's room, each group kept whole. */
  .groups {
    columns: 2 300px;
    column-gap: var(--space-5);
  }
  section {
    break-inside: avoid;
    margin-bottom: var(--space-3);
  }
  h3 {
    margin: 0 0 var(--space-1);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  dl {
    margin: 0;
    display: grid;
  }
  dl div {
    display: grid;
    grid-template-columns: 4.5rem 1fr;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--line);
  }
  dt,
  dd {
    margin: 0;
  }
  kbd {
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 600;
    padding: 1px var(--space-2);
    border: 1px solid var(--line);
    border-bottom-width: 2px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    white-space: nowrap;
  }
  .icon {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
  }
</style>
