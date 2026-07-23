#!/usr/bin/env bash
# End-to-end capture test for the bundle: drive the real OpenReplay tracker with
# Playwright to produce a session, then prove the session's DOM recording lands
# in object storage as mobs/<sessionID>/dom.mobs.
#
# Assumes `make up-bundle` has booted the stack.
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BROWTEST="$SRC_DIR/browtest"
APP_CONTAINER="${OR_BUNDLE_CONTAINER:-openreplay}"
S3_CONTAINER="${OR_S3_CONTAINER:-minio}"
PAGE_PORT="${PAGE_PORT:-8091}"
RUN_MS="${RUN_MS:-15000}"
S3_POLL_SECS="${S3_POLL_SECS:-240}"

fail(){ echo "E2E FAIL: $1"; exit 1; }

command -v node >/dev/null || fail "node not found (needed for Playwright)"
[ -d "$BROWTEST/node_modules" ] || (cd "$BROWTEST" && npm install --no-audit --no-fund && npx playwright install chromium)

echo "== serving test page on :$PAGE_PORT =="
( cd "$BROWTEST" && python3 -m http.server "$PAGE_PORT" ) >/tmp/or-e2e-httpd.log 2>&1 &
HTTPD=$!
trap 'kill $HTTPD 2>/dev/null' EXIT
sleep 2

echo "== driving tracker (Playwright, real session) =="
TEST_URL="http://localhost:${PAGE_PORT}/index.html" RUN_MS="$RUN_MS" \
  node "$BROWTEST/drive.mjs" 2>&1 | grep -E "RESP|captured" || true

# Session id from the http worker's ingest log (the /v1/web/i "response ok").
SID=$(docker logs "$APP_CONTAINER" 2>&1 \
  | grep '"url":"/v1/web/i"' | grep -oE '"sessionID":"[0-9]+"' \
  | tail -1 | grep -oE '[0-9]+')
[ -n "${SID:-}" ] || fail "no session id found in http ingest log (did beacons return 200?)"
echo "== captured sessionID=$SID =="

echo "== polling object storage for mobs/$SID/dom.mobs (up to ${S3_POLL_SECS}s) =="
waited=0
while [ "$waited" -lt "$S3_POLL_SECS" ]; do
  if docker exec "$S3_CONTAINER" sh -c "find /data/mobs/$SID/dom.mobs -type f 2>/dev/null | grep -q ." ; then
    echo ""
    echo "==== E2E PASS ===="
    echo "session $SID recorded and uploaded:"
    docker exec "$S3_CONTAINER" sh -c "ls -la /data/mobs/$SID/dom.mobs/ 2>/dev/null | grep -vE '^total|^d'"
    exit 0
  fi
  sleep 10; waited=$((waited+10)); echo "  ...${waited}s: dom.mobs not in storage yet"
done
fail "session $SID never produced mobs/$SID/dom.mobs within ${S3_POLL_SECS}s"
