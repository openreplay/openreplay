#!/usr/bin/env bash
# Acceptance test for the OSS scanner image (.oss-scanner/Dockerfile).
#
# The scanner builds the image online, then works in it OFFLINE. So every
# check below runs in a container started with --network none:
#   - the checkout is at /src and rebuilds without network
#   - every FOSS component is built
#   - `or-start` boots a working instance from the bundled databases
#
# Usage (from the repo root):
#   .oss-scanner/check.sh             # build the image, then test it
#   SKIP_BUILD=1 .oss-scanner/check.sh
set -uo pipefail

IMG="${IMG:-openreplay-oss-scanner:local}"
NAME="or-scan-check-$$"
BOOT_SECS="${BOOT_SECS:-300}"
WORKERS=(http ender sink storage db assets api images canvases spot tasks)

pass=0; fail=0
ok(){ echo "  PASS: $1"; pass=$((pass+1)); }
no(){ echo "  FAIL: $1"; fail=$((fail+1)); }
x(){ docker exec "$NAME" bash -c "$1"; }
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1; }
trap cleanup EXIT

if [ -z "${SKIP_BUILD:-}" ]; then
  echo "== build $IMG"
  docker build -f .oss-scanner/Dockerfile -t "$IMG" . || { echo "FAIL: image build"; exit 1; }
fi
docker image inspect "$IMG" >/dev/null 2>&1 || { echo "FAIL: no image $IMG"; exit 1; }

echo "== offline container"
docker run -d --name "$NAME" --network none "$IMG" or-start >/dev/null || { echo "FAIL: run"; exit 1; }
[ "$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$NAME")" = none ] && ok "no network" || no "network not none"

echo "== source and builds"
x 'test -f /src/backend/go.mod && test -f /src/api/app.py && test -f /src/frontend/package.json' \
  && ok "checkout at /src" || no "checkout missing at /src"
for w in "${WORKERS[@]}"; do
  x "test -x /src/backend/bin/$w" && ok "built $w" || no "missing /src/backend/bin/$w"
done
x 'file /src/backend/bin/http | grep -q "with debug_info"' && ok "workers keep debug info" || no "workers stripped"
x 'test -f /src/frontend/public/index.html' && ok "frontend built" || no "frontend not built"
x 'test -d /src/assist/node_modules && test -d /src/sourcemapreader/node_modules' \
  && ok "node services installed" || no "assist/sourcemapreader deps missing"
x 'cd /src/backend && go build -o /tmp/http-rebuild ./cmd/http' \
  && ok "go rebuild works offline" || no "go rebuild needs network"
x 'cd /src/api && /opt/venv/bin/python -c "import fastapi, psycopg, clickhouse_connect, boto3"' \
  && ok "api deps importable" || no "api deps missing"

echo "== boot (up to ${BOOT_SECS}s)"
up=0
for _ in $(seq 1 "$BOOT_SECS"); do
  x 'curl -fsS -o /dev/null http://127.0.0.1/' 2>/dev/null && { up=1; break; }
  docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null | grep -q true || break
  sleep 1
done
[ $up = 1 ] && ok "edge serves the UI" || { no "edge not up"; docker logs --tail 60 "$NAME"; }
sleep 20  # let crash-looping workers show themselves

for w in "${WORKERS[@]}"; do
  x "pgrep -f '^/src/backend/bin/$w\$' >/dev/null" && ok "$w running" || no "$w not running"
done
x 'pgrep -f "uvicorn app:app" >/dev/null' && ok "chalice running" || no "chalice not running"
crashed=$(x 'grep -l "\[or-start\] .* exited" /var/log/openreplay/*.log' 2>/dev/null)
[ -z "$crashed" ] && ok "no service restarted" || no "services restarted: $(echo $crashed | xargs -n1 basename | tr '\n' ' ')"
zombies=$(x 'ps -eo stat= | grep -c ^Z')
[ "$zombies" = 0 ] && ok "no zombie processes" || no "$zombies zombie processes"
x 'curl -s -o /dev/null http://127.0.0.1:9001/' && ok "assist answers" || no "assist down"
x 'curl -s -o /dev/null http://127.0.0.1:9010/' && ok "sourcemapreader answers" || no "sourcemapreader down"

echo "== data stores"
x 'psql -h 127.0.0.1 -U postgres -tAc "select 1 from projects limit 0" postgres' >/dev/null \
  && ok "postgres schema" || no "postgres schema missing"
[ "$(x 'clickhouse client -q "select count() from system.tables where database in ('"'"'default'"'"','"'"'experimental'"'"','"'"'product_analytics'"'"')"' 2>/dev/null)" -gt 0 ] 2>/dev/null \
  && ok "clickhouse schema" || no "clickhouse schema missing"
x 'valkey-cli ping | grep -q PONG' && ok "valkey" || no "valkey down"
x '/opt/venv/bin/python /usr/local/bin/or-s3 has mobs' && ok "object store bucket mobs" || no "bucket mobs missing"

echo "== end to end, through the edge"
login=$(x 'curl -s -X POST http://127.0.0.1/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"Password123!\"}"')
echo "$login" | grep -q '"jwt"' && ok "login with the seeded admin" || no "login failed: ${login:0:200}"
key=$(x 'psql -h 127.0.0.1 -U postgres -tAc "select project_key from projects order by project_id limit 1" postgres' | tr -d '[:space:]')
[ -n "$key" ] && ok "seeded project $key" || no "no project"
TS=$(date +%s%3N)
start=$(x "curl -s -X POST http://127.0.0.1/ingest/v1/web/start -H 'Content-Type: application/json' \
  -d '{\"projectKey\":\"$key\",\"timestamp\":$TS,\"timezone\":\"UTC\",\"trackerVersion\":\"6.0.0\",\"revID\":\"1\",\"doNotRecord\":false,\"width\":1920,\"height\":1080}'")
echo "$start" | grep -q '"token"' && ok "ingest start returns a token" || no "ingest start: ${start:0:200}"
x 'curl -fsS -o /dev/null http://127.0.0.1/v2/api/' && ok "go api answers through the edge" || no "go api down"

echo
echo "RESULT: $pass passed, $fail failed"
[ $fail -eq 0 ]
