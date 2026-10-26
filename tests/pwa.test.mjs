import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildManifest,
  computeBuildId,
  renderServiceWorker,
  ICONS
} from '../scripts/vite-plugin-pwa-lite.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = fs.readFileSync(path.join(root, 'scripts', 'sw-template.js'), 'utf8');

test('manifest has what browsers need to offer installation', () => {
  const m = buildManifest();
  for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'background_color', 'theme_color']) {
    assert.ok(m[key], `manifest.${key}`);
  }
  assert.ok(m.start_url.startsWith('./'), 'start_url must be relative so it works on GitHub Pages sub-paths');
  assert.ok(m.icons.some((i) => i.sizes === '192x192'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
});

test('every icon file the plugin needs exists in ./pwa and is a PNG', () => {
  for (const file of [...ICONS.map((i) => i.file), 'apple-touch-icon.png', 'favicon-32.png']) {
    const buf = fs.readFileSync(path.join(root, 'pwa', file));
    assert.equal(buf.subarray(1, 4).toString(), 'PNG', file);
  }
});

test('build id is stable for the same files and changes when a file changes', () => {
  const a = computeBuildId(['./assets/index-1.js', './index.html']);
  assert.equal(a, computeBuildId(['./index.html', './assets/index-1.js']));
  assert.notEqual(a, computeBuildId(['./assets/index-2.js', './index.html']));
  assert.match(a, /^[0-9a-f]{10}$/);
});

test('rendered service worker is valid JavaScript with its placeholders filled in', () => {
  const files = ['./', './index.html', './assets/index-1.js'];
  const code = renderServiceWorker(template, files, 'abc123');
  assert.doesNotThrow(() => new vm.Script(code));
  assert.ok(!code.includes('__BUILD_ID__') && !code.includes('__PRECACHE_LIST__'));
  assert.ok(code.includes("CACHE_PREFIX + 'abc123'"));
  assert.ok(code.includes('"./assets/index-1.js"'));
});

// --- Run the real service worker against a tiny fake browser ---------------------------------

function makeBrowser({ online = true } = {}) {
  const stores = new Map(); // cacheName -> Map(url -> response)
  const handlers = {};
  const origin = 'https://arcade.test';
  const abs = (u) => new URL(typeof u === 'string' ? u : u.url, `${origin}/game/sw.js`).href;
  const makeResponse = (body) => ({ ok: true, type: 'basic', body, clone() { return this; } });
  let network = online;
  const networkHits = [];

  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(urls) { for (const u of urls) store.set(abs(u), makeResponse(`precached:${u}`)); },
        async put(req, res) { store.set(abs(req), res); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async match(req) {
      for (const store of stores.values()) if (store.has(abs(req))) return store.get(abs(req));
      return undefined;
    }
  };

  const self = {
    location: { origin },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => { self.claimed = true; } }
  };

  const fakeFetch = async (req) => {
    networkHits.push(abs(req));
    if (!network) throw new Error('offline');
    return makeResponse(`network:${abs(req)}`);
  };
  // Every install gets a fresh JS context (like a new worker version) but shares caches & events.
  const loadWorker = (code) => {
    const context = vm.createContext({ self, caches, URL, Promise, fetch: fakeFetch });
    vm.runInContext(code, context);
  };

  const fire = async (type, extra = {}) => {
    let pending;
    const event = { waitUntil: (p) => { pending = p; }, respondWith: (p) => { pending = p; }, ...extra };
    handlers[type](event);
    return pending;
  };

  return {
    stores, networkHits, self,
    setOnline: (v) => { network = v; },
    install: (code) => { loadWorker(code); return fire('install'); },
    activate: () => fire('activate'),
    request: (url, init = {}) => fire('fetch', {
      request: { url: abs(url), method: 'GET', mode: 'cors', ...init }
    })
  };
}

const SW = (buildId, files = ['./', './index.html', './assets/app-1.js']) => renderServiceWorker(template, files, buildId);

test('service worker precaches the app shell on install', async () => {
  const b = makeBrowser();
  await b.install(SW('v1'));
  const store = b.stores.get('neonpulse-v1');
  assert.ok(store.has('https://arcade.test/game/index.html'));
  assert.ok(store.has('https://arcade.test/game/assets/app-1.js'));
});

test('activating a new version deletes old neonpulse caches but leaves other sites alone', async () => {
  const b = makeBrowser();
  await b.install(SW('v1'));
  b.stores.set('somebody-elses-cache', new Map());
  await b.install(SW('v2')); // a new deploy: new worker code, new cache name
  await b.activate();
  assert.ok(!b.stores.has('neonpulse-v1'));
  assert.ok(b.stores.has('neonpulse-v2'));
  assert.ok(b.stores.has('somebody-elses-cache'));
  assert.equal(b.self.claimed, true);
});

test('cached assets are served without touching the network', async () => {
  const b = makeBrowser();
  await b.install(SW('v1'));
  const res = await b.request('./assets/app-1.js');
  assert.equal(res.body, 'precached:./assets/app-1.js');
  assert.equal(b.networkHits.length, 0);
});

test('page loads go to the network first, then fall back to the cached page when offline', async () => {
  const b = makeBrowser();
  await b.install(SW('v1'));
  const online = await b.request('./', { mode: 'navigate' });
  assert.ok(online.body.startsWith('network:'));
  b.setOnline(false);
  const offline = await b.request('./', { mode: 'navigate' });
  assert.equal(offline.body, online.body); // the page cached on the last online visit
});

test('cross-origin requests and non-GET requests are left alone', async () => {
  const b = makeBrowser();
  await b.install(SW('v1'));
  assert.equal(await b.request('https://cdn.other.test/x.js'), undefined);
  assert.equal(await b.request('./x', { method: 'POST' }), undefined);
  assert.equal(b.networkHits.length, 0);
});

// --- The Vite plugin itself, driven the way Vite drives it ------------------------------------

import { pwaLite } from '../scripts/vite-plugin-pwa-lite.js';

function runPlugin(rootDir = root) {
  const plugin = pwaLite();
  plugin.configResolved({ root: rootDir });
  const emitted = new Map();
  const ctx = {
    emitFile: ({ fileName, source }) => emitted.set(fileName, source),
    error: (msg) => { throw new Error(msg); }
  };
  const bundle = {
    'index.html': { type: 'asset', source: '<html></html>' },
    'assets/index-abc.js': { type: 'chunk', code: 'console.log(1)' },
    'assets/index-abc.css': { type: 'asset', source: 'body{}' },
    'assets/index-abc.js.map': { type: 'asset', source: '{}' }
  };
  plugin.generateBundle.call(ctx, {}, bundle);
  return { plugin, emitted };
}

test('plugin emits manifest, icons and a service worker that precaches the whole build', () => {
  const { emitted } = runPlugin();
  for (const f of ['manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png']) {
    assert.ok(emitted.has(f), `${f} should be emitted`);
  }
  const sw = emitted.get('sw.js');
  assert.doesNotThrow(() => new vm.Script(sw));
  for (const f of ['./', './index.html', './assets/index-abc.js', './assets/index-abc.css', './manifest.webmanifest', './icons/icon-192.png']) {
    assert.ok(sw.includes(JSON.stringify(f)), `${f} should be precached`);
  }
  assert.ok(!sw.includes('index-abc.js.map'), 'source maps are not precached');
  assert.ok(!sw.includes('"./sw.js"'), 'the worker does not cache itself');
  assert.doesNotThrow(() => JSON.parse(emitted.get('manifest.webmanifest')));
});

test('plugin adds the manifest, theme colour and icon tags to the page', () => {
  const { plugin } = runPlugin();
  const tags = plugin.transformIndexHtml();
  assert.ok(tags.some((t) => t.tag === 'link' && t.attrs.rel === 'manifest' && t.attrs.href.startsWith('./')));
  assert.ok(tags.some((t) => t.tag === 'meta' && t.attrs.name === 'theme-color'));
  assert.ok(tags.some((t) => t.attrs.rel === 'apple-touch-icon'));
});

test('a missing icon fails the build with a clear message instead of shipping a broken app', () => {
  assert.throws(() => runPlugin(path.join(root, 'tests')), /PWA icon missing/);
});

test('two builds of different code get different cache names', () => {
  const a = runPlugin().emitted.get('sw.js');
  const plugin = pwaLite();
  plugin.configResolved({ root });
  const emitted = new Map();
  plugin.generateBundle.call(
    { emitFile: ({ fileName, source }) => emitted.set(fileName, source), error: (m) => { throw new Error(m); } },
    {},
    { 'index.html': { type: 'asset', source: '<html></html>' }, 'assets/index-NEW.js': { type: 'chunk', code: '1' } }
  );
  const cacheName = (code) => /CACHE_PREFIX \+ '([0-9a-f]+)'/.exec(code)[1];
  assert.notEqual(cacheName(a), cacheName(emitted.get('sw.js')));
});
