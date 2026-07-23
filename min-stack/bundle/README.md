# Minimal ingest bundle

One supervised container running all six core OpenReplay workers under
[s6-overlay], instead of six separate containers. External infra (postgres,
clickhouse, valkey/redis, minio/rustfs) still runs alongside.

```
┌──────────────── openreplay (ONE container) ─────────────────┐
│  /init  s6-overlay  (PID 1: supervise + restart + reap)      │
│    init-envdirs (oneshot) → /work/env/{_shared,<worker>}     │
│    ┌──────┬───────┬──────┬─────────┬──────┬────────┐         │
│    │ http │ ender │ sink │ storage │  db  │ assets │  longruns│
│    └──────┴───────┴──────┴─────────┴──────┴────────┘         │
│    each run: with-contenv                                    │
│              s6-envdir /work/env/_shared    (shared config)  │
│              s6-envdir /work/env/<worker>   (own secrets)    │
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

## How the end-to-end test works

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

### Repackage released binaries, do NOT build from source
The bundle copies the published `*:v1.27.x` worker binaries
(`/home/openreplay/service` in each image) and runs them under s6. It does not
compile the workers from the repo `HEAD`.

Why: `HEAD` is newer than the released JS tracker. `HEAD`'s http worker requires
a `split` query param for `visual` batches; the CDN `/latest` tracker does not
send one, so every `/v1/web/i` returned **400 "split value is empty"** and no
data ever reached the queue. Repackaging the released binaries keeps the ingest
protocol in lockstep with the released tracker. It is also a truer "bundle" —
supervise proven artifacts rather than rebuild them.

### Per-service env via s6 envdirs (not one merged env)
Workers disagree on some vars (notably `BUCKET_NAME`: http=`uxtesting-records`,
storage=`mobs`, assets=`sessions-assets`). Merging into one container env would
collide. Instead each worker reads its own envdir:

- `/work/env/_shared` — the union of all six images' baked config (topics,
  groups, tunables), generated into `shared.env`.
- `/work/env/<worker>` — the per-worker `docker-envs/<worker>.env` (secrets,
  connection strings) plus `SERVICE_NAME` and an `AWS_ENDPOINT` pointed at the
  in-network object store.

`build-envdirs.sh` (an s6 oneshot) builds these at start from the mounted,
already-`envsubst`'d `docker-envs/`. Since the per-worker envdir is applied
after `_shared`, worker-specific values win — the `BUCKET_NAME` conflict never
arises.

## Gotchas

- **`ghcr.io/openreplay/minio:2025` is a minio SERVER image, not the `mc`
  client.** Passing `mc ls ...` to it makes it try to boot as a server
  ("Waiting for a minimum of 2 drives"). To inspect the store, exec into the
  object-store container and look under `/data` directly (what `e2e.sh` does),
  or use a real `mc`/`aws` client.
- **The store is rustfs, not classic minio.** Small objects are inlined into
  `xl.meta` (no separate `part.*` file), so a recorded `dom.mobs` shows up as
  `/data/mobs/<sid>/dom.mobs/xl.meta` — that is the object, present is proof.
- **CORS / secure mode for local capture.** The released http worker ships with
  `USE_CORS=false` (relies on the edge proxy). For the Playwright capture we set
  `__DISABLE_SECURE_MODE: true` in the tracker init and launch chromium with
  `--disable-web-security`, then post straight to `:8090`. In a real deployment
  the caddy CORS proxy on `:8095` fronts ingest instead.
- **`common.env` must define the signing secrets.** `COMMON_JWT_SECRET`,
  `COMMON_JWT_SPOT_SECRET` and `COMMON_TOKEN_SECRET` must be non-empty — the
  http worker treats `TOKEN_SECRET` as required. They are in
  `common.env.example`.
- **`/mnt/efs` must exist.** sink/storage stage the `.mob` there before upload;
  the Dockerfile creates it.
- **Session upload is not instant.** `storage` only uploads once `ender` decides
  the session ended (idle after the last beacon), typically ~2 min. `e2e.sh`
  polls up to 240s.

[s6-overlay]: https://github.com/just-containers/s6-overlay
