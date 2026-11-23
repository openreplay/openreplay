## Why

The `minimal-ingest-compose` stack runs the 6 core ingest workers as 6 separate
containers. That is the right shape for isolation and per-worker scaling, but for
a demo, CI smoke test, or single-artifact distribution it means 6 images to pull,
6 things to schedule, and 6 log streams to correlate.

A single supervised image that runs all 6 workers collapses the application tier
to one artifact while keeping the external stateful infra (postgres, clickhouse,
redis, minio) separate. The repo already ships a naive `Dockerfile.bundle` that
backgrounds the workers with `nohup ... & wait` under `tini`; that reaps zombies
and forwards signals but never restarts a worker that dies and has no start
ordering — one crashed worker silently degrades the whole pipeline. We want a
properly supervised bundle.

## What Changes

- Add a single-container bundle image under `min-stack/bundle/` that runs the 6
  core workers (`http`, `ender`, `sink`, `storage`, `db`, `assets`) under the
  `s6-overlay` v3 init/supervisor as PID 1.
- Each worker is an `s6-rc` longrun service with per-process automatic restart,
  clean SIGTERM forwarding on `docker stop`, and zombie reaping (replacing
  `tini` + `nohup & wait`).
- Add a compose variant (`min-stack/docker-compose.bundle.yaml`) that runs one
  `openreplay` application container plus the same external infra and migration
  jobs already used by the multi-container stack.
- Add a `make up-bundle` / `make down-bundle` path.
- The ingest behavior contract is unchanged: same session flow, same topics,
  same `.mob` staging, same S3 layout as `minimal-ingest-pipeline`.

## Capabilities

### New Capabilities
- `minimal-ingest-bundle`: A single supervised container image that runs all 6
  core ingest workers under s6-overlay, with per-process restart and clean
  shutdown, producing the same ingest→process→S3 outcome as the multi-container
  minimal stack.

### Modified Capabilities
<!-- No requirement change to minimal-ingest-pipeline; the bundle reuses its
     behavior contract unchanged. This is an additional deployment topology. -->

## Impact

- **New files**: `min-stack/bundle/Dockerfile`, `min-stack/bundle/s6-rc.d/**`,
  `min-stack/docker-compose.bundle.yaml`, bundle targets in `min-stack/Makefile`.
- **Services**: same 6 FOSS binaries (cmd/http, cmd/ender, cmd/sink,
  cmd/storage, cmd/db, cmd/assets) — now one image instead of six.
- **Infra**: reuses postgres, clickhouse, valkey, minio images and migration
  jobs from the multi-container stack.
- **New dependency**: `s6-overlay` v3 (C binaries, negligible image size).
- **No changes** to Go source; deployment/packaging only.
