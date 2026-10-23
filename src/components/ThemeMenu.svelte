<script lang="ts">
  import Palette from '@lucide/svelte/icons/palette';
  import { setTheme, theme, THEMES, type ThemeChoice } from '../lib/theme.svelte';

  let open = $state(false);
  let root = $state<HTMLElement>();

  const options: { id: ThemeChoice; label: string; swatch: readonly string[] }[] = [
    { id: 'auto', label: 'Auto', swatch: ['#faf8f3', '#1f242c'] },
    ...THEMES.map((t) => ({ id: t.id, label: t.label, swatch: t.swatch })),
  ];

  function pick(id: ThemeChoice) {
    setTheme(id);
    open = false;
  }

  $effect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root?.contains(e.target as Node)) open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  });
</script>

<div class="theme" bind:this={root}>
  <button type="button" class="trigger" aria-label="Theme" aria-haspopup="true" aria-expanded={open} onclick={() => (open = !open)}>
    <Palette size={20} aria-hidden="true" />
  </button>
  {#if open}
    <div class="menu" role="radiogroup" aria-label="Theme">
      {#each options as o (o.id)}
        <button type="button" role="radio" aria-checked={theme.choice === o.id} class:on={theme.choice === o.id} onclick={() => pick(o.id)}>
          <span class="swatch" style:--a={o.swatch[0]} style:--b={o.swatch[1]} aria-hidden="true"></span>
          <span>{o.label}</span>
          {#if o.id === 'auto'}<span class="hint">follows system</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .theme {
    position: relative;
    flex: none;
  }
  .trigger {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
    color: var(--ink-2);
  }
  .trigger:hover,
  .trigger[aria-expanded='true'] {
    background: var(--surface-2);
    color: var(--ink);
  }
  .menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + var(--space-2));
    z-index: 20;
    min-width: 200px;
    padding: var(--space-1);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    display: grid;
  }
  :global(.wide) .menu {
    bottom: auto;
    top: calc(100% + var(--space-2));
  }
  .menu button {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;
  }
  .menu button:hover {
    background: var(--surface-2);
  }
  .menu button.on {
    background: var(--accent-soft);
    font-weight: 600;
  }
  .swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: linear-gradient(135deg, var(--a) 50%, var(--b) 50%);
  }
  .hint {
    margin-left: auto;
    color: var(--ink-2);
    font-size: var(--text-xs);
  }
</style>
