import { defineConfig } from 'vite';
import { classicScriptForFileProtocol } from './scripts/vite-plugin-classic-script.js';
import { pwaLite } from './scripts/vite-plugin-pwa-lite.js';

export default defineConfig(({ command }) => ({
  base: './', // Relative paths so it works on GitHub Pages, Netlify, Vercel, itch.io, file://, etc.
  server: {
    port: 3000,
    open: false
  },
  define: {
    // The service worker is only registered in production builds (see src/main.js).
    __PWA_ENABLED__: JSON.stringify(command === 'build')
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  plugins: [classicScriptForFileProtocol(), pwaLite()]
}));
