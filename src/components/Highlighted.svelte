<script lang="ts">
  let { text, ranges }: { text: string; ranges: [number, number][] } = $props();

  const parts = $derived.by(() => {
    const out: [string, boolean][] = [];
    let at = 0;
    for (const [s, e] of ranges) {
      if (s > at) out.push([text.slice(at, s), false]);
      out.push([text.slice(s, e), true]);
      at = e;
    }
    if (at < text.length) out.push([text.slice(at), false]);
    return out;
  });
</script>

{#each parts as [part, marked], i (i)}{#if marked}<mark>{part}</mark>{:else}{part}{/if}{/each}
