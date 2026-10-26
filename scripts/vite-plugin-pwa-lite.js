// Vite plugin: makes the arcade installable and playable offline (PWA) with no extra dependencies.
// Build only. It emits manifest.webmanifest, the icons from ./pwa, and a service worker (sw.js)
// whose precache list and cache name change with every build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const THEME_COLOR = '#0a0a14';

export const ICONS = [
  { file: 'icon-192.png', sizes: '192x192', purpose: 'any' },
  { file: 'icon-512.png', sizes: '512x512', purpose: 'any' },
  { file: 'icon-maskable-512.png', sizes: '512x512', purpose: 'maskable' }
];

export function buildManifest() {
  return {
    id: './',
    name: 'NeonPulse Arcade',
    short_name: 'NeonPulse',
    description: 'Six retro cyberpunk arcade games with tech tree progression and a local Hall of Fame.',
    start_url: './',
    scope: './',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    categories: ['games'],
    icons: ICONS.map((i) => ({
      src: `icons/${i.file}`,
      sizes: i.sizes,
      type: 'image/png',
      purpose: i.purpose
    }))
  };
}

export function computeBuildId(parts) {
  const hash = crypto.createHash('sha1');
  for (const p of [...parts].sort()) hash.update(String(p)).update('\n');
  return hash.digest('hex').slice(0, 10);
}

export function renderServiceWorker(template, files, buildId) {
  const list = JSON.stringify(files, null, 2);
  // split/join replaces every occurrence (String.replace with a string only replaces the first).
  const code = template.split('__BUILD_ID__').join(buildId).split('__PRECACHE_LIST__').join(list);
  if (code.includes('__BUILD_ID__') || code.includes('__PRECACHE_LIST__')) {
    throw new Error('Service worker template placeholders were not all replaced');
  }
  return code;
}

export function pwaLite() {
  let root = process.cwd();

  return {
    name: 'neonpulse-pwa-lite',
    apply: 'build',
    enforce: 'post',

    configResolved(config) {
      root = config.root;
    },

    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { name: 'theme-color', content: THEME_COLOR }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: './icons/favicon-32.png' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './icons/apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'NeonPulse' }, injectTo: 'head' }
      ];
    },

    generateBundle(_options, bundle) {
      const emitted = [];
      const emit = (fileName, source) => {
        this.emitFile({ type: 'asset', fileName, source });
        emitted.push(fileName);
      };

      const manifest = JSON.stringify(buildManifest(), null, 2);
      emit('manifest.webmanifest', manifest);

      const iconDir = path.join(root, 'pwa');
      const iconFiles = [...ICONS.map((i) => i.file), 'apple-touch-icon.png', 'favicon-32.png'];
      for (const file of iconFiles) {
        const full = path.join(iconDir, file);
        if (!fs.existsSync(full)) {
          this.error(`PWA icon missing: ${path.relative(root, full)}`);
        }
        emit(`icons/${file}`, fs.readFileSync(full));
      }

      const bundled = Object.keys(bundle).filter((name) => !name.endsWith('.map') && name !== 'sw.js');
      const files = Array.from(new Set(['./', './index.html', ...bundled, ...emitted].map((n) =>
        n === './' ? n : (n.startsWith('./') ? n : `./${n}`)
      )));

      const html = bundle['index.html'];
      const buildId = computeBuildId([
        ...files,
        manifest,
        html && html.type === 'asset' ? String(html.source) : ''
      ]);

      const template = fs.readFileSync(path.join(root, 'scripts', 'sw-template.js'), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderServiceWorker(template, files, buildId) });
    }
  };
}
