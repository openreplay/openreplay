#!/usr/bin/env bash
# End-to-end proof for the UI stack: sign up, capture a real session through the
# edge test page (Playwright), then verify the full replay data path:
#   /v2/api/<proj>/sessions/<id>/first-mob -> presigned domURL -> fetch via edge
#   -> a real (zstd) dom.mobs recording.
#
# Assumes `make up-ui` has booted the stack.
set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BROWTEST="$SRC_DIR/../bundle/browtest"
EDGE="${OR_EDGE_URL:-http://localhost:9000}"
APP_CONTAINER="${OR_BUNDLE_CONTAINER:-openreplay}"
S3_CONTAINER="${OR_S3_CONTAINER:-minio}"
S3_INTERNAL_HOST="${OR_S3_INTERNAL_HOST:-minio.db.svc.cluster.local:9000}"
EMAIL="${OR_EMAIL:-admin@example.com}"
PASSWORD="${OR_PASSWORD:-Password123!}"
PROJECT_ID="${OR_PROJECT_ID:-1}"
RUN_MS="${RUN_MS:-15000}"
S3_POLL_SECS="${S3_POLL_SECS:-240}"

fail(){ echo "E2E-UI FAIL: $1"; exit 1; }

command -v node >/dev/null || fail "node not found (needed for Playwright)"
[ -d "$BROWTEST/node_modules" ] || (cd "$BROWTEST" && npm install --no-audit --no-fund && npx playwright install chromium)

echo "== ensure an account exists (signup is idempotent-ish; ignore if taken) =="
curl -s -X POST "$EDGE/api/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullname\":\"Admin\",\"organizationName\":\"MinStack\"}" \
  >/dev/null 2>&1 || true

echo "== login =="
JWT=$(curl -s -X POST "$EDGE/api/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('jwt',''))" 2>/dev/null)
[ -n "$JWT" ] || fail "login did not return a jwt"
echo "  got jwt"

echo "== capture a session via the edge test page (Playwright) =="
LOG_BEFORE=$(docker logs "$APP_CONTAINER" 2>&1 | grep -c '"url":"/v1/web/i"')
TEST_URL="$EDGE/testpage/" RUN_MS="$RUN_MS" node "$BROWTEST/drive.mjs" 2>&1 | grep -E "RESP|captured|closed" || true
SID=$(docker logs "$APP_CONTAINER" 2>&1 | grep '"url":"/v1/web/i"' \
  | tail -n +$((LOG_BEFORE + 1)) | grep -oE '"sessionID":"[0-9]+"' | tail -1 | grep -oE '[0-9]+')
[ -n "${SID:-}" ] || fail "no new session id captured through the edge"
echo "  sessionID=$SID"

echo "== wait for storage upload (mobs/$SID/dom.mobs), up to ${S3_POLL_SECS}s =="
waited=0
until docker exec "$S3_CONTAINER" sh -c "find /data/mobs/$SID/dom.mobs -type f 2>/dev/null | grep -q ."; do
  sleep 10; waited=$((waited+10)); echo "  ...${waited}s"
  [ "$waited" -ge "$S3_POLL_SECS" ] && fail "dom.mobs never uploaded for $SID"
done
echo "  uploaded"

echo "== replay data path: first-mob -> presigned -> fetch via edge =="
URL=$(curl -s "$EDGE/v2/api/$PROJECT_ID/sessions/$SID/first-mob" -H "Authorization: Bearer $JWT" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['domURL'][0])" 2>/dev/null)
[ -n "$URL" ] || fail "first-mob returned no domURL"
# the api signs with the internal object-store host; the player fetches it
# same-origin through the edge, which forwards that Host so the S3 signature holds.
EDGEURL=$(printf '%s' "$URL" | sed "s#http://$S3_INTERNAL_HOST#$EDGE#")
code=$(curl -s -o /tmp/or-e2e-dom.mobs -w '%{http_code}' "$EDGEURL")
[ "$code" = "200" ] || fail "presigned dom.mobs fetch via edge returned $code"
if file /tmp/or-e2e-dom.mobs | grep -qi "Zstandard"; then
  echo ""
  echo "==== E2E-UI PASS ===="
  echo "session $SID: captured, processed, and replay recording fetched (zstd) via the edge"
  exit 0
fi
fail "fetched body is not a zstd recording: $(file /tmp/or-e2e-dom.mobs)"
