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

### Restart semantics
s6 restarts any longrun that exits (default behavior). A crashed `sink` comes
back automatically — the property the current bundle lacks. This is the key
verifiable behavior (test: kill a worker PID, assert s6 respawns it).

### Image build
Multi-stage: reuse the existing golang build stage to compile the 6 binaries,
then a final alpine stage that extracts the s6-overlay tarballs, installs the
runtime deps (`librdkafka`, sasl, ca-certificates), and drops in the s6 service
tree. Only the 6 core workers are built (drop `integrations` from the existing
bundle's 7).

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
- **Env sprawl**: all workers share one env in one container; a var meant for one
  worker is visible to all. Low risk (names are already global COMMON_*).
