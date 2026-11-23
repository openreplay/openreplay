#!/usr/bin/env bash
# Smoke test for the minimal-ingest-bundle capability.
# Asserts the spec scenarios against a booted bundle stack (one supervised
# container running all six core workers under s6-overlay).
#
# Preconditions: `make up-bundle` has booted the stack.
# Usage:  ./smoke.sh          # run all scenarios
#         SKIP_S3=1 ./smoke.sh  # skip the slow completed-session upload poll
set -uo pipefail

CONTAINER="${OR_BUNDLE_CONTAINER:-openreplay}"
NET="${OR_BUNDLE_NET:-or-minimal_openreplay-net}"
INGEST_PORT="${INGEST_PORT:-8095}"
PROJECT_KEY="${OR_PROJECT_KEY:-testkey0000000000001}"
S3_KEY="${COMMON_S3_KEY:-test_s3_key}"
S3_SECRET="${COMMON_S3_SECRET:-test_s3_secret}"
MINIO_IMG="${OR_MINIO_IMAGE:-ghcr.io/openreplay/minio:2025}"
STOP_GRACE="${STOP_GRACE:-20}"
S3_POLL_SECS="${S3_POLL_SECS:-240}"
WORKERS=(http ender sink storage db assets)
SVC_DIR="/run/service"
S6_SVSTAT="/command/s6-svstat"   # s6 tools live in /command, not on docker-exec PATH

pass=0; fail=0
ok(){ echo "  PASS: $1"; pass=$((pass+1)); }
no(){ echo "  FAIL: $1"; fail=$((fail+1)); }
svstat(){ docker exec "$CONTAINER" "$S6_SVSTAT" "$SVC_DIR/$1" 2>/dev/null; }
svpid(){ svstat "$1" | grep -oE 'pid [0-9]+' | grep -oE '[0-9]+'; }

echo "== Scenario 1: exactly one app container running =="
running=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo missing)
[ "$running" = "true" ] && ok "container '$CONTAINER' is running" || no "container '$CONTAINER' not running ($running)"

echo "== Scenario 2: all six worker processes supervised & up =="
for w in "${WORKERS[@]}"; do
  st=$(svstat "$w" | awk '{print $1}')
  [ "$st" = "up" ] && ok "worker '$w' is up" || no "worker '$w' not up ($st)"
done

echo "== Scenario 3: POST /v1/web/start returns 200 + token =="
TS=$(date +%s%3N)
resp=$(curl -s -w '\n%{http_code}' -X POST "http://localhost:${INGEST_PORT}/v1/web/start" \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d "{\"projectKey\":\"${PROJECT_KEY}\",\"timestamp\":${TS},\"timezone\":\"UTC\",\"trackerVersion\":\"6.0.0\",\"revID\":\"1\",\"doNotRecord\":false,\"width\":1920,\"height\":1080}" 2>&1)
code=$(printf '%s' "$resp" | tail -1)
body=$(printf '%s' "$resp" | sed '$d')
[ "$code" = "200" ] && ok "start returned 200" || no "start returned $code"
echo "$body" | grep -q '"token"' && ok "response contains session token" || no "no token in response"

echo "== Scenario 5: killed worker is respawned by s6 =="
victim="sink"
pid1=$(svpid "$victim")
if [ -n "${pid1:-}" ]; then
  echo "  $victim pid before kill: $pid1"
  docker exec "$CONTAINER" kill -9 "$pid1" 2>/dev/null
  sleep 4
  pid2=$(svpid "$victim")
  echo "  $victim pid after kill:  ${pid2:-none}"
  if [ -n "${pid2:-}" ] && [ "$pid2" != "$pid1" ]; then
    ok "s6 respawned '$victim' ($pid1 -> $pid2)"
  else
    no "s6 did not respawn '$victim' (before=$pid1 after=${pid2:-none})"
  fi
else
  no "could not read '$victim' pid via s6-svstat"
fi

if [ "${SKIP_S3:-0}" = "1" ]; then
  echo "== Scenario 4: SKIPPED (SKIP_S3=1) =="
else
  echo "== Scenario 4: completed session uploads .mob to S3 (poll ${S3_POLL_SECS}s) =="
  found=0; waited=0
  while [ "$waited" -lt "$S3_POLL_SECS" ]; do
    objs=$(docker run --rm --network "$NET" \
      -e MC_HOST_m="http://${S3_KEY}:${S3_SECRET}@minio.db.svc.cluster.local:9000" \
      "$MINIO_IMG" mc ls --recursive m/mobs 2>/dev/null | wc -l)
    if [ "${objs:-0}" -gt 0 ]; then found=1; break; fi
    sleep 10; waited=$((waited+10)); echo "  ... waited ${waited}s, mobs empty"
  done
  [ "$found" = "1" ] && ok "session artifact present in mobs bucket" || no "no object in mobs bucket after ${S3_POLL_SECS}s"
fi

echo "== Scenario 6: docker stop terminates gracefully within grace =="
start=$(date +%s)
docker stop -t "$STOP_GRACE" "$CONTAINER" >/dev/null 2>&1
rc=$?
elapsed=$(( $(date +%s) - start ))
ec=$(docker inspect -f '{{.State.ExitCode}}' "$CONTAINER" 2>/dev/null || echo "?")
if [ "$rc" = "0" ] && [ "$elapsed" -lt "$STOP_GRACE" ]; then
  ok "stopped gracefully in ${elapsed}s (exit code $ec, no SIGKILL)"
else
  no "stop took ${elapsed}s / rc=$rc / exit=$ec (grace=$STOP_GRACE)"
fi

echo ""
echo "==== RESULT: $pass passed, $fail failed ===="
[ "$fail" = "0" ]
