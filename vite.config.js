import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative paths so it works on GitHub Pages, Netlify, Vercel, itch.io, etc.
  server: {
    port: 3000,
    open: false
  }
});
