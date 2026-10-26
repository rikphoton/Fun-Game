// Vite plugin: emit a plain deferred <script> instead of <script type="module" crossorigin>.
//
// The arcade ships as one self-contained bundle (no code splitting, no import/export in the
// output), so it can run as a classic script. Browsers refuse to load module scripts from file://
// (blank page when double-clicking dist/index.html), and Electron used to need webSecurity:false
// for the same reason.

const MODULE_SYNTAX = /^\s*(import|export)\b/m;
const IMPORT_META = /\bimport\.meta\b/;

export function rewriteHtmlForClassicScript(html) {
  return html
    .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
    .replace(/<link rel="stylesheet" crossorigin href="/g, '<link rel="stylesheet" href="');
}

export function usesModuleSyntax(code) {
  return MODULE_SYNTAX.test(code) || IMPORT_META.test(code);
}

export function classicScriptForFileProtocol() {
  return {
    name: 'neonpulse-classic-script-for-file-protocol',
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (usesModuleSyntax(chunk.code)) {
          this.error(
            `${fileName} contains ES module syntax, so it cannot be loaded as a classic script ` +
            `from file://. Keep the build as a single chunk (no dynamic imports).`
          );
        }
      }
    },
    transformIndexHtml(html) {
      return rewriteHtmlForClassicScript(html);
    }
  };
}
