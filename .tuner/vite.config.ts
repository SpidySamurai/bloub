import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  build: {
    lib: { entry: fileURLToPath(new URL('./entry.ts', import.meta.url)), name: 'Bloub', formats: ['iife'], fileName: () => 'bloub.js' },
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    minify: 'oxc'
  }
})
