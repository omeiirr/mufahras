<script lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';

  let {
    value = $bindable(''),
    input = $bindable<HTMLInputElement | undefined>(),
    onkeydown,
  }: { value: string; input?: HTMLInputElement; onkeydown?: (e: KeyboardEvent) => void } = $props();
</script>

<div class="bar" role="search">
  <Search size={20} aria-hidden="true" />
  <input
    bind:this={input}
    bind:value
    {onkeydown}
    type="search"
    aria-label="Search the Quran and hadith"
    placeholder="Search the Quran and hadith"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    enterkeyhint="search"
  />
  {#if value}
    <button
      type="button"
      class="clear"
      aria-label="Clear search"
      onclick={() => {
        value = '';
        input?.focus();
      }}><X size={20} aria-hidden="true" /></button
    >
  {/if}
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2) 0 var(--space-4);
    min-height: 52px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 99px;
    box-shadow: var(--shadow);
    color: var(--ink-2);
  }
  .bar:focus-within {
    border-color: var(--focus);
    outline: 1px solid var(--focus);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    color: var(--ink);
    font-size: var(--text-lg);
    padding: var(--space-3) 0;
  }
  input::placeholder {
    color: var(--ink-2);
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .clear {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border-radius: 50%;
    color: var(--ink-2);
  }
  .clear:hover {
    background: var(--surface-2);
  }
</style>
