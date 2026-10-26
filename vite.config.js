import { defineConfig } from 'vite';

// The arcade ships as a single self-contained bundle (no code splitting, no import/export in the
// output). That lets us emit a plain deferred <script> instead of <script type="module" crossorigin>,
// which browsers refuse to load from file:// (blank page when double-clicking dist/index.html, and
// the reason the Electron build used to need webSecurity:false).
function classicScriptForFileProtocol() {
  return {
    name: 'neonpulse-classic-script-for-file-protocol',
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (/^\s*(import|export)\b/m.test(chunk.code) || /\bimport\.meta\b/.test(chunk.code)) {
          this.error(
            `${fileName} contains ES module syntax, so it cannot be loaded as a classic script ` +
            `from file://. Keep the build as a single chunk (no dynamic imports).`
          );
        }
      }
    },
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="stylesheet" crossorigin href="/g, '<link rel="stylesheet" href="');
    }
  };
}

export default defineConfig({
  base: './', // Relative paths so it works on GitHub Pages, Netlify, Vercel, itch.io, file://, etc.
  server: {
    port: 3000,
    open: false
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  plugins: [classicScriptForFileProtocol()]
});
