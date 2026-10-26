#!/usr/bin/env bash
# macOS / Linux: build the bundle and launch the Electron desktop app.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
exec npm run desktop
