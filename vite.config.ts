import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; relative paths work for both that and local preview.
  base: './',
  plugins: [svelte()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
