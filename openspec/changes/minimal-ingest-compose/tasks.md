## 1. Audit dependencies

- [x] 1.1 Extract the service blocks for `http`, `ender`, `sink`, `storage`,
  `db`, `assets` from `scripts/docker-compose/docker-compose.yaml` (images,
  env_file, volumes, depends_on, ports)
- [x] 1.2 Audit each worker's env file in `scripts/docker-compose/docker-envs/`
  for vars referencing excluded services. Finding: FOSS queue is hardcoded to
  redisstream (`KAFKA_SERVERS`/`LICENSE_KEY` are inert); topics, UAParser, and
  GeoIP paths are baked into the image ENV, not the env files. The only var that
  must be overridden is `AWS_ENDPOINT` (points at the nginx domain).
- [x] 1.3 Confirm the `assets` re-loop. Finding: `sink` → `TOPIC_CACHE` →
  `assets` (downloads to minio, rewrites URLs) → `TOPIC_RAW_WEB`. `assets` boots
  cleanly with the baked `ASSETS_ORIGIN`; no extra wiring needed for ingest.
- [x] 1.4 Identify the minimal infra + migration jobs (`postgresql`,
  `clickhouse`, `redis`, `minio`, `fs-permission`, `minio-migration`,
  `db-migration`, `clickhouse-migration`) and their healthcheck/completion gates

## 2. Author the minimal compose

- [x] 2.1 Create `min-stack/docker-compose.yaml` with the 4
  infra services, 4 migration jobs, and 6 workers only
- [x] 2.2 Wire `depends_on` so migrations gate on infra health and workers gate
  on infra health (workers self-heal via `restart: unless-stopped` until schemas
  land, mirroring the full compose)
- [x] 2.3 Configure redisstream queue transport (workers → `redis`); no kafka
  image or license service referenced
- [x] 2.4 Publish the `http` ingest port to the host (no nginx/caddy)
- [x] 2.5 Reuse `docker-envs/*.env` unchanged; override only `AWS_ENDPOINT` via
  the compose `environment:` block for `http`, `storage`, `assets`

## 3. End-to-end verification (PROVEN)

- [x] 3.1 Drove the real tracker (openreplay.js 18.1.0) in headless chromium
  against `http:8080`; `/v1/web/start` → 200, `/v1/web/i` binary batches → 200
- [x] 3.2 Object store contains `mobs/{sessionID}/dom.mobs` (499B, zstd magic
  `28 b5 2f fd`, decompresses to 690B containing the recorded page URL)
- [x] 3.3 `experimental.sessions` row present in ClickHouse (HeadlessChrome /
  Linux / desktop)
- [x] 3.4 Only the 6 workers + 4 infra + 4 migrations are defined; no excluded
  service appears

## 4. Harden for reuse (findings from the proof run)

- [ ] 4.1 Make host ports configurable — `${HTTP_PORT:-8080}` and the minio
  console `${MINIO_CONSOLE_PORT:-9001}` — to avoid collisions with a full stack
  on the same host (hit `8080`/`9001` already-allocated during the proof)
- [x] 4.2 Seed a default `projects` row (with a known `project_key`) — the
  minimal stack has no api/chalice to create one, so ingest 403s on an empty DB
  until a project exists. Implemented as `min-stack/run.sh seed` (idempotent
  INSERT ... ON CONFLICT DO NOTHING); fold into a compose one-shot job later if
  a pure `compose up` bootstrap is wanted
- [x] 4.3 CORS: added a `caddy` sidecar (min-stack/Caddyfile) that replicates the
  nginx `Access-Control-*` headers and reverse proxies to `http:8080`. Tracker
  points `ingestPoint` at `caddy` on `${INGEST_PORT}`. Verified against a real
  Firefox recording end-to-end (session lands in CH + dom.mobs in S3)
- [ ] 4.4 Document in `scripts/docker-compose/readme.md`: what the minimal stack
  runs and excludes, how to seed a project, the `__DISABLE_SECURE_MODE: true`
  requirement for non-SSL localhost tracker testing, and the
  `docker logout public.ecr.aws` fix for stale-credential 403s on pull
- [ ] 4.5 Confirm no Go source changed (deployment-only change)
