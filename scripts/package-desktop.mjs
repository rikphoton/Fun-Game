// Packages the desktop app with @electron/packager for the requested platform/arch.
// Usage: node scripts/package-desktop.mjs [platform] [arch]
//   platform: win32 | darwin | linux   (default: the current OS)
//   arch:     x64 | arm64 | universal  (default: the current CPU)
import { packager } from '@electron/packager';

const platform = process.argv[2] || process.platform;
const arch = process.argv[3] || process.arch;

// Only what the app needs at runtime: package.json, electron/ and the built dist/.
const IGNORE = [
  /^\/\.git(\/|$)/,
  /^\/\.github(\/|$)/,
  /^\/src(\/|$)/,
  /^\/scripts(\/|$)/,
  /^\/tests(\/|$)/,
  /^\/pwa(\/|$)/,
  /^\/dist-desktop(\/|$)/,
  /^\/vite\.config\.js$/,
  /^\/index\.html$/,
  /^\/package-lock\.json$/,
  /^\/.*\.(bat|sh)$/,
  /^\/\.gitignore$/
];

const paths = await packager({
  dir: '.',
  name: 'NeonPulse-Arcade',
  platform,
  arch,
  out: 'dist-desktop',
  overwrite: true,
  asar: true,
  prune: true,
  ignore: IGNORE
});

console.log(`\nBuild complete. Output:\n  ${paths.join('\n  ')}`);
