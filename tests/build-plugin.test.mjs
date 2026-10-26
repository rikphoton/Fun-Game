import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rewriteHtmlForClassicScript,
  usesModuleSyntax,
  classicScriptForFileProtocol
} from '../scripts/vite-plugin-classic-script.js';

test('built html gets a classic deferred script and no crossorigin attributes', () => {
  const html = [
    '<script type="module" crossorigin src="./assets/index-abc.js"></script>',
    '<link rel="stylesheet" crossorigin href="./assets/index-abc.css">'
  ].join('\n');
  const out = rewriteHtmlForClassicScript(html);
  assert.ok(out.includes('<script defer src="./assets/index-abc.js"></script>'));
  assert.ok(out.includes('<link rel="stylesheet" href="./assets/index-abc.css">'));
  assert.ok(!/crossorigin|type="module"/.test(out));
});

test('module syntax in a bundle is detected', () => {
  assert.equal(usesModuleSyntax('import x from "y";'), true);
  assert.equal(usesModuleSyntax('const a=1;\nexport{a};'), true);
  assert.equal(usesModuleSyntax('console.log(import.meta.url)'), true);
  assert.equal(usesModuleSyntax('(function(){var important=1;})()'), false);
});

test('the plugin fails the build when a chunk contains module syntax', () => {
  const plugin = classicScriptForFileProtocol();
  const ctx = { error: (m) => { throw new Error(m); } };
  assert.throws(() => plugin.generateBundle.call(ctx, {}, { 'a.js': { type: 'chunk', code: 'import a from "b";' } }), /classic script/);
  assert.doesNotThrow(() => plugin.generateBundle.call(ctx, {}, { 'a.js': { type: 'chunk', code: 'console.log(1)' }, 'a.css': { type: 'asset' } }));
});
