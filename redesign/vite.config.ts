import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('../docs/redesign', import.meta.url)),
      ],
    },
  },
  preview: { port: 5173, strictPort: true },
  build: { outDir: 'node_modules/.cache/redesign-dist', emptyOutDir: true },
});
