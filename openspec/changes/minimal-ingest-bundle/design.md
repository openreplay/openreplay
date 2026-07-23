## Context

`minimal-ingest-compose` runs the 6 core workers as separate compose services;
docker/compose supervises each (restart policy, per-service health). The repo's
existing `backend/Dockerfile.bundle` collapses workers into one image but its
`entrypoint.sh` is:

```
for name in ...; do nohup bin/$name | awk '{prefix}' & done
wait
```

Under `tini` as PID 1. `tini` reaps zombies and forwards signals but does NOT
supervise: a worker that exits is never restarted, there is no start ordering,
and `wait` only returns when the last background job dies. This change adds a
properly supervised single-container image without touching Go source.

The container boundary allows exactly one PID 1. To run 6 processes correctly in
one container that PID 1 must: reap zombies, forward `docker stop` signals to
every worker, restart a worker that dies, and order startup. `nohup & wait` does
none well; `tini` does the first two only.

## Goals / Non-Goals

**Goals:**
- One image running all 6 core workers with per-process automatic restart.
- Clean shutdown: `docker stop` forwards SIGTERM to every worker, graceful exit.
- Identical ingest outcome to the multi-container stack (200 + token → S3 .mob).
- Negligible image-size and runtime overhead over the naive bundle.

**Non-Goals:**
- Replacing the multi-container stack (both topologies coexist).
- Bundling external stateful infra (postgres/clickhouse/redis/minio stay out).
- Per-worker horizontal scaling or per-worker health endpoints (lost by design
  when collapsing to one container — acceptable for demo/CI/single-artifact).
- Changing queue backend, topics, or Go source.

## Decisions

### Init/supervisor: s6-overlay v3 (not systemd, tini, or supervisord)

```
systemd    | Designed as PID 1 of a full OS. Needs cgroup mounts +
           | privileged/CAP_SYS_ADMIN. Heavy, container anti-pattern. Rejected.
tini       | init ONLY: zombie reap + signal forward. No restart, no ordering.
           | Necessary but not sufficient — this is today's gap. Rejected alone.
supervisord| Works, but drags a Python runtime (~50MB) and forwards signals
           | less cleanly than a native init. Rejected for lean Go image.
s6-overlay | C binaries (~KB), PID 1 + real supervisor: per-service restart,
           | dependency order, correct signal/zombie semantics. Chosen.
```

Each worker becomes an `s6-rc` service dir under
`/etc/s6-overlay/s6-rc.d/<name>/` with `type=longrun` and a `run` script that
`exec`s the binary. `s6-overlay` provides `/init` as PID 1; no `tini` needed.

### Per-service env via s6-envdir (not one merged env)

The workers do NOT share a single env: `BUCKET_NAME` differs per worker
(`http`=uxtesting-records, `storage`=mobs, `assets`=sessions-assets), so merging
all worker envs into one container env would collide. s6 gives per-service env
exactly like systemd's `Environment=`. Each service's `run` script reads its own
envdir:

```
run:  exec s6-envdir /work/env/<name> /work/bin/<name>
```

An envdir is a directory where each filename is a variable and the file content
is its value. We reuse the existing per-worker `docker-envs/<name>.env` files:
after the Makefile's existing `envsubst` expands `${COMMON_*}`, a build/init step
converts each expanded `.env` into `/work/env/<name>/`. Every worker then sees
the identical env it gets in the multi-container stack — the `BUCKET_NAME`
conflict never arises because envs are never merged.

### Restart semantics
s6 restarts any longrun that exits (default behavior). A crashed `sink` comes
back automatically — the property the current bundle lacks. This is the key
verifiable behavior (test: kill a worker PID, assert s6 respawns it).

### Image build: repackage released binaries, do NOT build from source
The image copies the published `*:v1.27.x` worker binaries
(`/home/openreplay/service` in each release image) and runs them under s6. It
does not compile the workers from the repo `HEAD`.

Why: `HEAD` is newer than the released JS tracker. The `HEAD` http worker
requires a `split` query param for `visual` batches; the CDN `/latest` tracker
does not send one, so every `/v1/web/i` returned 400 "split value is empty" and
no data reached the queue (verified with Playwright). Repackaging the released
binaries keeps the ingest protocol in lockstep with the released tracker, and is
a truer "bundle" — supervise proven artifacts rather than rebuild them.

The image bases on the release `http` image (which already carries the alpine
runtime deps `librdkafka`/sasl/ca-certs plus the geoip and uaparser data),
extracts the s6-overlay tarballs, copies the other five worker binaries, and
drops in the s6 service tree. Only the 6 core workers are included (no
`integrations`). Shared config comes from `shared.env` (the union of all six
images' baked env) loaded as the `_shared` envdir.

### Compose wiring
`min-stack/docker-compose.bundle.yaml`: one `openreplay` service from the bundle
image, all `COMMON_*` + worker env passed to it, only the http port exposed
(other workers are queue consumers), plus the same infra + migration jobs and
the caddy CORS proxy from the multi-container stack.

## Risks / Trade-offs

- **Failure isolation lost**: one OOM/segfault can affect neighbors sharing the
  container. Mitigation: s6 restarts the individual process; acceptable for the
  target use (demo/CI), not for production multi-tenant.
- **No per-worker health/scale**: single container = single health signal and
  single scaling unit. Accepted (see Non-Goals).
- **s6 learning curve**: execline `run` scripts are unfamiliar. Mitigation: keep
  each `run` to a one-line `exec`; document the layout.
- **Coupled lifecycle**: `docker stop` stops all workers together. Acceptable —
  matches the "single artifact" intent.
- **Env isolation**: resolved by per-service `s6-envdir` (see Decisions) — each
  worker reads only its own envdir, so conflicting vars like `BUCKET_NAME` stay
  separate exactly as in the multi-container stack.
