# OpenReplay (FOSS) for the Anthropic OSS Scanner.
#
# Builds every FOSS component from this checkout and bundles the data stores,
# so a standalone instance boots with no network: `or-start`.
#
#   go workers   http ender sink storage db assets api images canvases spot tasks
#   chalice      api/ (python, uvicorn)              :8000
#   assist       assist/ (node)                      :9001
#   smr          sourcemapreader/ (node)             :9010
#   frontend     frontend/ (static, served by nginx)
#   edge         nginx                               :80
#   stores       postgres :5432, clickhouse :8123/:9000, valkey :6379, rustfs :9300
#
# Login: admin@example.com / Password123!  (seeded by the build-time smoke run)
# The enterprise sources (ee/) are not built.
#
#   docker build -f .oss-scanner/Dockerfile -t openreplay-oss-scanner .

# Built in its own stage so it runs alongside the Go module fetch.
FROM node:24-slim AS frontend
COPY --from=oven/bun:1.4.3 /usr/local/bin/bun /usr/local/bin/bun
COPY player /src/player
COPY frontend /src/frontend
RUN cd /src/player && bun install --frozen-lockfile
WORKDIR /src/frontend
RUN bun install --frozen-lockfile && cp .env.sample .env
# If the bundle fails the rest still builds, and the edge serves no UI.
RUN NODE_OPTIONS=--max-old-space-size=8192 bun run build \
    || { echo "WARNING: the frontend bundle failed, the instance serves the APIs only"; mkdir -p public; }

FROM golang:1.26-trixie

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git jq procps file less unzip \
      postgresql-17 postgresql-client-17 valkey-server nginx \
      python3 python3-venv python3-dev build-essential libpq-dev \
      ffmpeg zstd musl \
    && rm -rf /var/lib/apt/lists/*

# Runtimes and stores not packaged by debian, at the versions the project ships.
COPY --from=node:26-trixie-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:26-trixie-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
COPY --from=clickhouse/clickhouse-server:26.2 /usr/bin/clickhouse /usr/bin/clickhouse
COPY --from=clickhouse/clickhouse-server:26.2 /etc/clickhouse-server /etc/clickhouse-server
# rustfs is a musl build; debian's `musl` package provides its loader.
COPY --from=rustfs/rustfs:1.0.0-beta.1 /usr/bin/rustfs /usr/bin/rustfs

# --- Go workers. Default go build keeps DWARF, and the module + build caches
# stay in the image so a patched worker rebuilds offline. backend/ is copied
# first so edits elsewhere in the checkout keep this layer cached.
COPY backend /src/backend
WORKDIR /src/backend
RUN go mod download
ARG WORKERS="http ender sink storage db assets api images canvases spot tasks"
RUN for w in $WORKERS; do echo "building $w"; CGO_ENABLED=1 go build -o bin/$w ./cmd/$w || exit 1; done

# --- chalice (api/)
COPY api/requirements.txt /tmp/api-requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /tmp/api-requirements.txt

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
RUN cp /src/api/env.default /src/api/.env

# --- node services. sourcemapreader shares assist's utils (see its build.sh).
RUN cd /src/assist && npm ci \
    && cd /src/sourcemapreader && cp -R ../assist/utils . && npm ci

COPY --from=frontend /src/frontend/public /src/frontend/public

# --- http worker data files (as backend/Dockerfile)
RUN mkdir -p /home/openreplay /mnt/efs /var/log/openreplay /data/rustfs /var/lib/clickhouse \
    && wget -q https://raw.githubusercontent.com/ua-parser/uap-core/master/regexes.yaml -O /home/openreplay/regexes.yaml \
    && wget -q https://static.openreplay.com/geoip/dbip-city-lite.mmdb -O /home/openreplay/geoip.mmdb

# Shared worker config (backend/Dockerfile's baked ENV), pointed at the local stores.
ENV TZ=UTC \
    FS_ULIMIT=10000 FS_DIR=/mnt/efs \
    MAXMINDDB_FILE=/home/openreplay/geoip.mmdb UAPARSER_FILE=/home/openreplay/regexes.yaml \
    KAFKA_USE_SSL=false KAFKA_USE_KERBEROS=false KAFKA_MAX_POLL_INTERVAL_MS=400000 \
    REDIS_STREAMS_MAX_LEN=10000 REDIS_STREAMS_TTL_SEC=0 \
    TOPIC_RAW_WEB=raw TOPIC_RAW_IOS=raw-ios TOPIC_RAW_IMAGES=raw-images TOPIC_CACHE=cache \
    TOPIC_ANALYTICS=analytics TOPIC_TRIGGER=trigger TOPIC_MOBILE_TRIGGER=mobile-trigger \
    TOPIC_CANVAS_IMAGES=canvas-images TOPIC_CANVAS_TRIGGER=canvas-trigger \
    TOPIC_RAW_ANALYTICS=raw-analytics TOPIC_RAW_ASSETS=raw-assets \
    GROUP_SINK=sink GROUP_STORAGE=storage GROUP_DB=db GROUP_ENDER=ender GROUP_CACHE=cache \
    GROUP_HEURISTICS=heuristics GROUP_IMAGE_STORAGE=image-storage GROUP_CANVAS_IMAGE=canvas-image \
    GROUP_CANVAS_VIDEO=canvas-video GROUP_ANALYTICS=analytics GROUP_CLEANUP=cleaner \
    AWS_REGION=us-east-1 AWS_REGION_WEB=us-east-1 AWS_REGION_IOS=us-east-1 AWS_REGION_ASSETS=us-east-1 \
    AWS_SKIP_SSL_VALIDATION=false CACHE_ASSETS=true ASSETS_SIZE_LIMIT=60291456 \
    ASSETS_HEADERS="{ \"Cookie\": \"ABv=3;\" }" \
    FS_CLEAN_HRS=72 FILE_SPLIT_SIZE=1000000 LOG_QUEUE_STATS_INTERVAL_SEC=60 \
    DB_BATCH_QUEUE_LIMIT=20 DB_BATCH_SIZE_LIMIT=10000000 PARTITIONS_NUMBER=16 \
    QUEUE_MESSAGE_SIZE_LIMIT=1048576 BEACON_SIZE_LIMIT=1000000 \
    USE_FAILOVER=false GROUP_STORAGE_FAILOVER=failover TOPIC_STORAGE_FAILOVER=storage-failover \
    PROFILER_ENABLED=false COMPRESSION_TYPE=zstd COMPRESSION_THRESHOLD=20000 \
    MAX_FILE_SIZE=100000000 USE_ENCRYPTION=false CLOUD=aws USE_CORS=false RECORD_CANVAS=true \
    IS_FEATURE_FLAG_ENABLED=false IS_USABILITY_TEST_ENABLED=false KAFKA_DELIVERY_REPORTS=true \
    LICENSE_KEY="" \
    POSTGRES_STRING="postgres://postgres:changeme@127.0.0.1:5432/postgres?sslmode=disable" \
    pg_password=changeme \
    REDIS_STRING="redis://127.0.0.1:6379" \
    CLICKHOUSE_STRING="127.0.0.1:9000/default" CH_USERNAME=default CH_PASSWORD="" CH_DATABASE=default ch_db=default \
    AWS_ENDPOINT="http://127.0.0.1:9300" AWS_ACCESS_KEY_ID=or-s3-key AWS_SECRET_ACCESS_KEY=or-s3-secret \
    ASSETS_ORIGIN="http://127.0.0.1/sessions-assets" SITE_URL="http://127.0.0.1" \
    JWT_SECRET=or-jwt-secret JWT_SPOT_SECRET=or-jwt-spot-secret TOKEN_SECRET=or-token-secret \
    ASSIST_JWT_SECRET=or-assist-jwt-secret ASSIST_KEY=or-assist-key

COPY --chmod=755 <<'EOF' /usr/local/bin/or-s3
#!/opt/venv/bin/python
"""or-s3 init|has <bucket>: buckets in the bundled rustfs (as scripts/docker-compose/migration-files/minio.sh)."""
import json, os, sys, boto3
s3 = boto3.client("s3", endpoint_url=os.environ["AWS_ENDPOINT"], region_name="us-east-1")
BUCKETS = ["mobs", "sessions-assets", "static", "sourcemaps", "sessions-mobile-assets",
           "quickwit", "vault-data", "records", "spots", "uxtesting-records",
           "replay-exporter-videos"]
if sys.argv[1] == "has":
    sys.exit(0 if sys.argv[2] in {b["Name"] for b in s3.list_buckets()["Buckets"]} else 1)
have = {b["Name"] for b in s3.list_buckets()["Buckets"]}
for b in BUCKETS:
    if b not in have:
        s3.create_bucket(Bucket=b)
# anonymous read of known keys only, no ListBucket (GHSA-j6c9-g48h-wh4c)
s3.put_bucket_policy(Bucket="sessions-assets", Policy=json.dumps({"Version": "2012-10-17", "Statement": [
    {"Effect": "Allow", "Principal": {"AWS": ["*"]}, "Action": ["s3:GetObject"],
     "Resource": ["arn:aws:s3:::sessions-assets/*"]}]}))
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/or-db
#!/bin/bash
# or-db start|stop: the data stores bundled in this image.
L=/var/log/openreplay
wait_for(){ for _ in $(seq 1 120); do eval "$2" >/dev/null 2>&1 && return 0; sleep 1; done; echo "$1 did not start" >&2; tail -n 40 $L/$1.log >&2; return 1; }
case "$1" in
start)
  pg_ctlcluster 17 main start
  valkey-server --bind 127.0.0.1 --daemonize yes --logfile $L/valkey.log
  clickhouse server --daemon --pid-file=/run/clickhouse.pid -- --path=/var/lib/clickhouse/ \
    --logger.log=$L/clickhouse.log --logger.errorlog=$L/clickhouse.err.log
  RUSTFS_ACCESS_KEY=$AWS_ACCESS_KEY_ID RUSTFS_SECRET_KEY=$AWS_SECRET_ACCESS_KEY RUSTFS_ADDRESS=127.0.0.1:9300 \
    RUSTFS_CONSOLE_ENABLE=false RUSTFS_VOLUMES=/data/rustfs nohup rustfs >$L/rustfs.log 2>&1 &
  wait_for postgres "pg_isready -q -h 127.0.0.1" && wait_for valkey "valkey-cli ping" \
    && wait_for clickhouse "clickhouse client -q 'select 1'" && wait_for rustfs "or-s3 has mobs || or-s3 init"
  ;;
stop)
  pkill -x rustfs; clickhouse client -q 'SYSTEM FLUSH LOGS' >/dev/null 2>&1
  [ -f /run/clickhouse.pid ] && kill "$(cat /run/clickhouse.pid)"
  valkey-cli shutdown >/dev/null 2>&1; pg_ctlcluster 17 main stop
  for _ in $(seq 1 60); do pgrep -x 'clickhouse|rustfs|valkey-server' >/dev/null || break; sleep 1; done
  ;;
esac
EOF

# Ports: go HTTP workers get their own HTTP_PORT; every go worker also tries the
# shared :8888 metrics/health listener, only the first one wins (logged, harmless).
COPY --chmod=755 <<'EOF' /usr/local/bin/or-start
#!/bin/bash
# Starts the bundled stores and every OpenReplay service, then the edge on :80.
# Each service restarts on exit; logs in /var/log/openreplay/<name>.log.
set -e
L=/var/log/openreplay
# workers derive their id from HOSTNAME (backend/pkg/env/worker-id.go); docker
# build steps do not set it.
export HOSTNAME=${HOSTNAME:-$(hostname)}
or-db start
svc(){ local n=$1; shift; ( set +e; while :; do env "$@"; echo "[or-start] $n exited $?, restarting"; sleep 2; done ) >>$L/$n.log 2>&1 & }
gw(){ local n=$1; shift; svc "$n" SERVICE_NAME="$n" "$@" /src/backend/bin/$n; }
gw http     BUCKET_NAME=uxtesting-records HTTP_PORT=8080
gw api      BUCKET_NAME=mobs HTTP_PORT=8081 ASSIST_URL="http://127.0.0.1:9001/assist/%s" \
  JWT_MCP_SECRET=or-jwt-mcp JWT_MCP_ALGORITHM=HS512 REPLAY_EXPORT_BUCKET=replay-exporter-videos
gw spot     BUCKET_NAME=spots HTTP_PORT=8082
gw images   BUCKET_NAME=mobs HTTP_PORT=8083
gw canvases BUCKET_NAME=mobs HTTP_PORT=8084
gw ender    HTTP_PORT=8085
gw sink     HTTP_PORT=8086
gw storage  BUCKET_NAME=mobs HTTP_PORT=8087
gw db       HTTP_PORT=8088 REDIS_CACHE_ENABLED=false
gw assets   BUCKET_NAME=sessions-assets HTTP_PORT=8089
gw tasks    BUCKET_NAME=spots HTTP_PORT=8090
cd /src/api
svc chalice LISTEN_PORT=8000 pg_host=127.0.0.1 pg_password=changeme ch_host=127.0.0.1 ch_port=9000 \
  ch_port_http=8123 ch_user=default ch_password= CH_COMPRESSION=false \
  S3_HOST=http://127.0.0.1:9300 S3_KEY=$AWS_ACCESS_KEY_ID S3_SECRET=$AWS_SECRET_ACCESS_KEY \
  JWT_REFRESH_SECRET=or-jwt-refresh JWT_SPOT_REFRESH_SECRET=or-jwt-spot-refresh JWT_MCP_SECRET=or-jwt-mcp \
  ASSIST_URL="http://127.0.0.1:9001/assist/%s" sourcemaps_reader="http://127.0.0.1:9010/sourcemaps/{}/sourcemaps" \
  /opt/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --proxy-headers --log-level warning
cd /src/assist
svc assist LISTEN_PORT=9001 HEALTH_PORT=8891 REDIS_URL=127.0.0.1 redis=false node server.js
cd /src/sourcemapreader
svc sourcemapreader SERVICE_NAME=sourcemaps-reader SMR_HOST=127.0.0.1 SMR_PORT=9010 HEALTH_PORT=8892 \
  S3_HOST=http://127.0.0.1:9300 S3_KEY=$AWS_ACCESS_KEY_ID S3_SECRET=$AWS_SECRET_ACCESS_KEY node server.js
nginx
echo "[or-start] up: http://127.0.0.1/  (admin@example.com / Password123!)"
# bash as PID 1 reaps exited daemons; tail alone would leave zombies.
tail -qF $L/*.log &
wait
EOF

COPY <<'EOF' /etc/nginx/sites-enabled/default
# The edge, as scripts/docker-compose/nginx.conf, on the local services.
server {
  listen 80 default_server;
  client_max_body_size 100m;
  proxy_read_timeout 300s;
  proxy_set_header Host $http_host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  location ~ ^/(mobs|sessions-assets|static|sourcemaps|records|spots)(/|$) { proxy_pass http://127.0.0.1:9300; }
  location ~ ^/ingest/v1/web/images(/|$) { proxy_pass http://127.0.0.1:8084; }
  location ~ ^/ingest/v1/mobile/images(/|$) { rewrite ^/ingest/(.*) /$1 break; proxy_pass http://127.0.0.1:8083; }
  location /ingest/   { rewrite ^/ingest/(.*) /$1 break;    proxy_pass http://127.0.0.1:8080; }
  location /v2/api/   { rewrite ^/v2/api/(.*) /$1 break;    proxy_pass http://127.0.0.1:8081; }
  location /api/      { rewrite ^/api/(.*) /$1 break;       proxy_pass http://127.0.0.1:8000; }
  location /spot/     { rewrite ^/spot/(.*) /$1 break;      proxy_pass http://127.0.0.1:8082; }
  location /ws-assist/ {
    rewrite ^/ws-assist/(.*) /$1 break;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://127.0.0.1:9001;
  }
  root /src/frontend/public;
  location / { try_files $uri $uri/ /index.html; }
}
EOF

# Stores: postgres password + schema, clickhouse schema, buckets.
RUN sed -i "s/^#\?listen_addresses.*/listen_addresses = '127.0.0.1'/" /etc/postgresql/17/main/postgresql.conf \
    && sed -i 's/^\(host .*\)scram-sha-256$/\1trust/' /etc/postgresql/17/main/pg_hba.conf \
    && or-db start \
    && su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'changeme'\"" \
    && psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f /src/scripts/schema/db/init_dbs/postgresql/init_schema.sql postgres \
    && clickhouse client --multiquery < /src/scripts/schema/db/init_dbs/clickhouse/create/init_schema.sql \
    && or-db stop

# Smoke test: boot the instance once and seed the admin login (which creates the
# first project). A failure is reported in the build log and does not abort the build.
# Signup answers 500 offline: the account is committed first, then telemetry
# (api/chalicelib/core/telemetry.py) fails to reach api.openreplay.com. So the
# check is the login, not the signup response.
RUN --network=none (or-start > /tmp/or-smoke.log 2>&1 & \
     for _ in $(seq 1 180); do curl -fsS -o /dev/null http://127.0.0.1/api/signup 2>/dev/null && break; sleep 1; done; \
     curl -sS -o /dev/null -X POST http://127.0.0.1/api/signup -H 'Content-Type: application/json' \
       -d '{"email":"admin@example.com","password":"Password123!","fullname":"Admin","organizationName":"OpenReplay"}'; \
     curl -sS -X POST http://127.0.0.1/api/login -H 'Content-Type: application/json' \
       -d '{"email":"admin@example.com","password":"Password123!"}' \
       | grep -q '"jwt"' && echo "<- openreplay is up, admin seeded" \
       || { echo "WARNING: openreplay did not come up"; tail -n 80 /tmp/or-smoke.log; }; \
     pkill -f '^/bin/bash /usr/local/bin/or-start'; \
     pkill -f '^(/src/backend/bin/|/opt/venv/bin/python[^ ]* /opt/venv/bin/uvicorn|node server.js|tail -qF)'; \
     nginx -s stop; sleep 3; or-db stop; rm -f /var/log/openreplay/*) || echo "WARNING: smoke test failed"

# Everything is fetched: later builds (a rebuild after a patch) must not try the network.
ENV GOFLAGS=-mod=readonly GOPROXY=off npm_config_offline=true
WORKDIR /src
