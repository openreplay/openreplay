#!/bin/sh
set -e
cd "$(dirname "$0")"
../../tracker/node_modules/.bin/tsc -p tsconfig.json
bun build .build/experiments/dom-core/src/harness/page.js --outfile dist/page.js --target browser --format iife >/dev/null
(cd ../../../mcp_app && node_modules/.bin/esbuild ../tracker/experiments/dom-core/src/replay/entry.ts --bundle --format=iife --outfile=../tracker/experiments/dom-core/dist/replay.js --log-level=warning)
bun build .build/experiments/dom-core/src/features/page.js --outfile dist/features.js --target browser --format iife >/dev/null
