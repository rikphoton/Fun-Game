#!/usr/bin/env bash
# macOS / Linux: package the desktop app. Usage: ./build-desktop.sh [win32|darwin|linux] [x64|arm64|universal]
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run build
node scripts/package-desktop.mjs "$@"
