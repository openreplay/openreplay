# Minimal ingest bundle

One supervised container running all six core OpenReplay workers under
[s6-overlay], instead of six separate containers. External infra (postgres,
clickhouse, valkey/redis, minio/rustfs) still runs alongside.

```
┌──────────────── openreplay (ONE container) ─────────────────┐
│  /init  s6-overlay  (PID 1: supervise + restart + reap)      │
│    init-envdirs (oneshot) → /work/env/<worker>              │
│    ┌──────┬───────┬──────┬─────────┬──────┬────────┐         │
│    │ http │ ender │ sink │ storage │  db  │ assets │  longruns│
│    └──────┴───────┴──────┴─────────┴──────┴────────┘         │
│    each run: with-contenv                 (shared baked ENV) │
│              s6-envdir /work/env/<worker> (own secrets, wins)│
│              /work/bin/<worker>                              │
└──────────────────────────────────────────────────────────────┘
        caddy :8095 ──▶ openreplay(http):8080     (CORS proxy)
        infra: postgres · clickhouse · valkey · rustfs (external)
```

## Quick start

```sh
cd min-stack
cp common.env.example common.env      # local test creds

make up-bundle     # build image, boot the single container + infra, seed a project
make e2e           # record a real session with Playwright, prove it lands in S3
make down-bundle   # tear down + remove volumes

# or the whole thing in one shot (build + boot + e2e + smoke + teardown):
make test-bundle
```

Other targets: `make smoke` (fast checks + restart/shutdown proof),
`make logs-bundle`, `make ps-bundle`, `make capture` (Playwright only).

> The automated Playwright harness (`make e2e` / `bundle/e2e.sh`) currently
> drives the tracker over a `--disable-web-security` shortcut straight to the
> http worker, which mis-shapes `visual` batches. Prefer the manual browser flow
> below until that harness is fixed to go through the caddy proxy.

## Manual browser capture (recommended)

Caddy serves a ready-made test page and the CORS ingest proxy:

```
make up-bundle                     # boots caddy with :8095 (ingest) and :8096 (page)
# open in a real browser:
http://localhost:8096/
```

1. Interact with the page (click, type, add rows) to generate DOM activity.
2. **Close the tab** — the session only ends once beacons stop (see gotchas).
3. Wait ~2.5 min, then verify the upload:

```sh
docker exec minio sh -c 'find /data/mobs -name dom.mobs -type d'
#   /data/mobs/<sessionID>/dom.mobs   ← proof the session was recorded
```

The page (`session.html`) uses the standard tracker snippet with
`ingestPoint: http://localhost:8095` and `__DISABLE_SECURE_MODE: true`.

## How the automated end-to-end test works

`make e2e` (→ `bundle/e2e.sh`) proves the full ingest path with real data:

```
Playwright + tracker snippet          openreplay (bundle)
  ┌──────────────┐  /v1/web/start ──▶ ┌────────────────────────────┐
  │ chromium     │  200 + token       │ http ─raw─▶ sink ─▶ /mnt/efs│
  │ browtest/    │  /v1/web/i         │              <sid>s (staged)│
  │ index.html   │  200 visual+       │ ender (detects session end) │
  │ (CDN tracker)│  200 analytics     │ storage ─▶ object store      │
  └──────────────┘                    └──────────────┬──────────────┘
                                                      ▼
                              rustfs: mobs/<sessionID>/dom.mobs  ✅
```

1. Serves `browtest/index.html` (the standard OpenReplay tracker snippet).
2. Playwright drives real DOM activity; the tracker emits binary beacons.
3. Reads the `sessionID` from the http worker's `/v1/web/i` log line.
4. Polls the object store for `mobs/<sessionID>/dom.mobs` (upload happens on
   session end, ~2 min after the last beacon).

## Design notes / learnings

### Built from source (this repo's HEAD)
The bundle compiles the six workers from `backend/cmd/<worker>` (go 1.26,
`-tags dynamic`), mirroring `backend/Dockerfile`, and runs them under s6. It is
not a repackage of a published image.

This was proven with a real browser session: the CDN `/latest` tracker posting
through the caddy CORS proxy is accepted by the HEAD `http` worker on every
batch type (`visual`, `player`, `assets`, `analytics`, `devtools`) and the
session lands in object storage.

> Note: an earlier attempt saw `400 "split value is empty"` on `visual` batches
> and we briefly repackaged released binaries to work around it. That 400 turned
> out to be a **test-harness artifact**, not a version skew — see
> "Local capture caveat" below. Building from source is correct.

### Per-service env via s6 envdirs (not one merged env)
Workers disagree on some vars (notably `BUCKET_NAME`: http=`uxtesting-records`,
storage=`mobs`, assets=`sessions-assets`). Merging into one container env would
collide. The bundle splits shared vs per-worker config:

- **Shared config** (topics, groups, tunables) is baked as container `ENV` in
  the Dockerfile, mirroring `backend/Dockerfile`, and reaches every worker via
  `with-contenv`.
- **Per-worker env** (`/work/env/<worker>`) comes from the per-worker
  `docker-envs/<worker>.env` (secrets, connection strings, `BUCKET_NAME`) plus
  `SERVICE_NAME` and an `AWS_ENDPOINT` pointed at the in-network object store.

`build-envdirs.sh` (an s6 oneshot) builds each per-worker envdir at start from
the mounted, already-`envsubst`'d `docker-envs/`. Each service's `run` applies
`with-contenv` (shared ENV) then `s6-envdir /work/env/<worker>`, so per-worker
values override the shared ones — the `BUCKET_NAME` conflict never arises.

## Gotchas

- **`ghcr.io/openreplay/minio:2025` is a minio SERVER image, not the `mc`
  client.** Passing `mc ls ...` to it makes it try to boot as a server
  ("Waiting for a minimum of 2 drives"). To inspect the store, exec into the
  object-store container and look under `/data` directly (what `e2e.sh` does),
  or use a real `mc`/`aws` client.
- **The store is rustfs, not classic minio.** Small objects are inlined into
  `xl.meta` (no separate `part.*` file), so a recorded `dom.mobs` shows up as
  `/data/mobs/<sid>/dom.mobs/xl.meta` — that is the object, present is proof.
- **Always post through the caddy CORS proxy (`:8095`), not the worker
  directly.** The http worker runs `USE_CORS=false` and relies on the edge proxy
  for CORS. The tracker also sends a `split` query param on `visual` batches; the
  worker requires it. Posting straight to `:8090` and bypassing CORS with
  chromium `--disable-web-security` skips the normal request shaping and yields
  `400 "split value is empty"` on `visual` batches. Through caddy from a real
  browser it works. Set `__DISABLE_SECURE_MODE: true` in the tracker init so it
  starts on plain http/localhost (see `src/main/index.ts:141`), and point
  `ingestPoint` at `http://localhost:8095`.
- **`common.env` must define the signing secrets.** `COMMON_JWT_SECRET`,
  `COMMON_JWT_SPOT_SECRET` and `COMMON_TOKEN_SECRET` must be non-empty — the
  http worker treats `TOKEN_SECRET` as required. They are in
  `common.env.example`.
- **`/mnt/efs` must exist.** sink/storage stage the `.mob` there before upload;
  the Dockerfile creates it.
- **A session only ends after the tab is CLOSED.** The tracker sends a heartbeat
  every 2 min, so an open tab keeps the session alive forever. `ender` ends a
  session only after `EVENTS_SESSION_END_TIMEOUT` = 2 min + 30s of no beacons
  (`internal/ender/intervals.go`), and `storage` uploads only then. To capture:
  interact, **close the tab**, wait ~2.5 min for `dom.mobs` to appear.

[s6-overlay]: https://github.com/just-containers/s6-overlay
