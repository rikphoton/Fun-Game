#!/usr/bin/env bash
# macOS / Linux: start the dev server and open the browser when it is ready.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
exec npm run dev -- --open
