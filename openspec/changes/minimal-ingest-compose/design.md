## Context

The full stack lives in `scripts/docker-compose/docker-compose.yaml` with 19
application services plus infra, migrations, and a reverse proxy. Booting it for
local ingest work is slow and resource-heavy. Analysis of the Go backend
(`cmd/http`, `cmd/ender`, `cmd/sink`, `cmd/storage`, `cmd/db`, `cmd/assets`)
shows the raw "ingest → cache assets → process → upload to S3, and index for
search" path needs six workers plus four infra dependencies.

Data flow:

```
  SDK --/v1/web/start,/v1/web/i--> http --> Postgres (session row)
                                     | TOPIC_RAW_WEB
     +----------------------------+--------------------------+
     v                            v                          v
   sink --(asset refs)--> TOPIC_CACHE   ender                db
   FS .mob files                |     idle->SessionEnd    ClickHouse
     |                          v     (TOPIC_RAW_ASSETS)   events/index
     |                       assets: download CSS/JS/fonts --> minio (S3)
     |                       rewrite URLs --> re-loop TOPIC_RAW_WEB
     | on SessionEnd:
     | TOPIC_TRIGGER + close writer
     v
  storage --zstd/encrypt--> minio (S3)  {sid}/dom.mobs, dom.mobe
```

Shared infra: redisstream (queue) on `redis`/valkey, Postgres (session
metadata), ClickHouse (events), minio (object store). The `sink` and `storage`
workers share a filesystem volume for staging `.mob` files. The `assets` worker
caches external assets into minio and re-injects rewritten batches so replays
render without live external origins.

## Goals / Non-Goals

**Goals:**
- Ship `docker-compose.minimal.yaml` that boots the 6-worker FOSS ingest path.
- Reuse existing images, env files, and migration jobs from the full compose.
- Provide an end-to-end smoke test that ingests a session and asserts the replay
  object lands in minio and a row lands in ClickHouse.

**Non-Goals:**
- No dashboard/frontend, alerts, integrations, assist, spot, canvases, images,
  sourcemaps, or heuristics. (Asset caching via `assets` IS in scope.)
- No kafka / EE license path.
- No reverse proxy (nginx/caddy); the `http` ingest port is exposed directly.
- No changes to Go source code.

## Decisions

**Separate file, not a compose override/profile.**
A standalone `docker-compose.minimal.yaml` is the clearest contract and easiest
to test in CI. Alternative considered: compose `profiles:` on the existing file
— rejected because it keeps all 19 service definitions in scope and makes the
"only these run" assertion harder to verify. Alternative: a `-f base -f override`
merge — rejected for the same reason plus merge-semantics surprises.

**Keep the four migration jobs.** `fs-permission`, `minio-migration`,
`db-migration`, `clickhouse-migration` are prerequisites: without them the
volume permissions, bucket, and schemas do not exist and workers crash-loop.
They run once via `depends_on: service_completed_successfully`.

**redisstream queue.** FOSS backend requires no broker; workers point at the
`redis` (valkey) service via connection URL. This drops kafka + license service
entirely, matching the FOSS-only scope.

**Expose http directly.** With no nginx/caddy, publish the `http` container port
to the host so the SDK/smoke test can POST to it. Alternative: keep caddy —
rejected as unnecessary surface for a minimal local stack.

**Env files.** Reuse `scripts/docker-compose/docker-envs/*.env` where they exist
for the 6 workers; add minimal overrides only where the full stack assumes an
excluded service (e.g. any var pointing at `nginx`).

## Risks / Trade-offs

- **[assets ↔ sink loop]** `sink` produces asset-cache messages to `TOPIC_CACHE`;
  `assets` consumes them plus `TOPIC_RAW_ASSETS`, downloads assets to minio, and
  re-produces rewritten batches to `TOPIC_RAW_WEB`. → Both workers are in the
  minimal set and share the object store; ensure the re-loop topic wiring and
  `AssetsOrigin` point at the cached-copy base URL.
- **[ender reads session metadata from Postgres/Redis]** encryption key + platform
  come from the session row written by `http`. → Both are in the minimal stack;
  no external dependency.
- **[Excluded service env references]** worker env files may reference hosts for
  excluded services. → Audit each of the 6 env files; stub or drop dead vars so
  containers start clean.
- **[Drift from full compose]** the minimal file can rot as the full one evolves.
  → Keep it a strict subset with identical image tags/env vars; CI smoke test
  catches breakage.

## Migration Plan

Additive only — new file, no changes to the existing compose or Go code.
Rollback = delete the new file(s). Deploy: `docker compose -f
scripts/docker-compose/docker-compose.minimal.yaml up`, wait for migrations to
complete, then run the smoke test.

## Validation (proven on a live run)

The stack was booted from `docker-compose.minimal.yaml` (FOSS/redisstream) and a
real session was recorded end-to-end with openreplay.js 18.1.0 in headless
chromium:

- `/v1/web/start` → 200, `/v1/web/i` binary batches → 200
- `sink` staged `/mnt/efs/{sid}s`; `db` wrote an `experimental.sessions` row
- `ender` detected idle (150s = `HEARTBEAT_INTERVAL` 2m + 30s) → SessionEnd
- `storage` consumed `TOPIC_TRIGGER` → uploaded `mobs/{sid}/dom.mobs`
- downloaded object: zstd magic `28 b5 2f fd`, decompresses to the recorded
  page DOM

Findings folded into tasks:

- **Only `AWS_ENDPOINT` needs overriding.** Topics, UAParser, GeoIP are baked
  into the image ENV; FOSS queue is hardcoded redisstream (`KAFKA_SERVERS` /
  `LICENSE_KEY` inert). Env files are otherwise reused unchanged.
- **Empty DB blocks ingest.** No api/chalice means no `projects` row; ingest
  403s until one is seeded (task 4.2).
- **No CORS from `http`.** nginx supplied it in the full stack; browser tracker
  calls are blocked cross-origin without it (task 4.3).
- **Tracker refuses non-SSL localhost** without `__DISABLE_SECURE_MODE: true`.
- **Host port collisions** on `8080`/`9001` — make them configurable (task 4.1).
- **Env-specific:** stale `public.ecr.aws` creds in `~/.docker/config.json`
  caused 403 on image pull; `docker logout public.ecr.aws` fixes it.

## Open Questions

- What `AssetsOrigin` / base URL should the minimal `assets` worker use so
  rewritten URLs resolve to the minio-cached copies for a *replayable* (not just
  ingested) session in a local stack?
