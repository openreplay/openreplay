#!/usr/bin/env bash
# Smoke test for the minimal-frontend UI stack: one nginx edge serving the UI
# and routing API / ingest / asset traffic, with the api worker inside the s6
# bundle. Assumes the UI stack is booted (e.g. `make up-ui`).
set -uo pipefail

EDGE="${OR_EDGE_URL:-http://localhost:9000}"
APP_CONTAINER="${OR_BUNDLE_CONTAINER:-openreplay}"
PROJECT_KEY="${OR_PROJECT_KEY:-testkey0000000000001}"
SVC_DIR="/run/service"
S6_SVSTAT="/command/s6-svstat"

pass=0; fail=0
ok(){ echo "  PASS: $1"; pass=$((pass+1)); }
no(){ echo "  FAIL: $1"; fail=$((fail+1)); }

echo "== Scenario: UI is served from the edge =="
code=$(curl -s -o /tmp/ui.html -w '%{http_code}' "$EDGE/")
[ "$code" = "200" ] && ok "GET / -> 200" || no "GET / -> $code"
grep -qiE "<title>|openreplay|<div id=\"root\"|<script" /tmp/ui.html && ok "response looks like the UI (html)" || no "response is not html UI"

echo "== Scenario: api worker runs in the bundle on a non-8080 port =="
st=$(docker exec "$APP_CONTAINER" "$S6_SVSTAT" "$SVC_DIR/api" 2>/dev/null | awk '{print $1}')
[ "$st" = "up" ] && ok "s6 'api' service up" || no "s6 'api' service not up ($st)"
apiport=$(docker exec "$APP_CONTAINER" cat /work/env/api/HTTP_PORT 2>/dev/null)
[ -n "$apiport" ] && [ "$apiport" != "8080" ] && ok "api HTTP_PORT=$apiport (distinct from http)" || no "api HTTP_PORT not distinct ($apiport)"

echo "== Scenario: /v2/api reaches the api worker =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$EDGE/v2/api/")
# any HTTP status (not 000) means the proxy connected to the api worker
[ -n "$code" ] && [ "$code" != "000" ] && [ "$code" != "502" ] && [ "$code" != "504" ] \
  && ok "/v2/api/ reached api worker (status $code)" || no "/v2/api/ did not reach api (status $code)"

echo "== Scenario: /api reaches chalice =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$EDGE/api/")
[ -n "$code" ] && [ "$code" != "000" ] && [ "$code" != "502" ] && [ "$code" != "504" ] \
  && ok "/api/ reached chalice (status $code)" || no "/api/ did not reach chalice (status $code)"

echo "== Scenario: asset path proxies to object storage =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$EDGE/mobs/")
[ -n "$code" ] && [ "$code" != "000" ] && [ "$code" != "502" ] && [ "$code" != "504" ] \
  && ok "/mobs/ reached object store (status $code)" || no "/mobs/ did not reach store (status $code)"

echo "== Scenario: tracker ingest works same-origin =="
TS=$(date +%s%3N)
resp=$(curl -s -w '\n%{http_code}' -X POST "$EDGE/ingest/v1/web/start" \
  -H "Content-Type: application/json" \
  -d "{\"projectKey\":\"$PROJECT_KEY\",\"timestamp\":$TS,\"timezone\":\"UTC\",\"trackerVersion\":\"6.0.0\",\"revID\":\"1\",\"doNotRecord\":false,\"width\":1920,\"height\":1080}")
code=$(printf '%s' "$resp" | tail -1)
body=$(printf '%s' "$resp" | sed '$d')
[ "$code" = "200" ] && ok "/ingest/v1/web/start -> 200" || no "/ingest/v1/web/start -> $code"
echo "$body" | grep -q '"token"' && ok "ingest returned a session token" || no "no token in ingest response"

echo ""
echo "==== RESULT: $pass passed, $fail failed ===="
[ "$fail" = "0" ]
