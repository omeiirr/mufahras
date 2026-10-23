import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Content-hashed data chunks (quran.<hash>.json); safe to cache forever.
const HASHED_DATA = /\/data\/[\w-]+\.[0-9a-f]{10}\.json$/;

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; relative paths work for both that and local preview.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Mufahras: Quran & Hadith Search',
        short_name: 'Mufahras',
        description: 'Find any verse of the Quran or hadith of the six major collections as you type. Works offline.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        // Android paints the bar below an installed app from one of these (background_color on Android 15+,
        // theme_color on older versions), so both are the Paper background. The page's theme-color meta
        // still follows the in-app theme for the status bar.
        background_color: '#faf8f3',
        theme_color: '#faf8f3',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android: "Share" selected text from any app into Mufahras (handled in router.svelte.ts).
        share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      },
      workbox: {
        // App shell, fonts, icons, and the Quran itself, so a first visit is enough to work offline.
        // Hadith chunks are cached as the worker loads them (runtime rule below).
        globPatterns: ['**/*.{js,css,html,woff2,png}', 'data/quran.*.json', 'data/translit.*.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/manifest.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'mufahras-manifest', networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }) => HASHED_DATA.test(url.pathname),
            handler: 'CacheFirst',
            // The worker deletes entries no longer listed in the manifest (see pruneDataCache).
            options: { cacheName: 'mufahras-data', cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
