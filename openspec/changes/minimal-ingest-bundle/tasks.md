## 1. TDD contract (tests FIRST — must fail before any image exists)

- [x] 1.1 Write a smoke test script `min-stack/bundle/smoke.sh` that asserts the
  spec scenarios: (a) one app container running, (b) all 6 worker processes
  present inside it, (c) `POST /v1/web/start` returns 200 + token, (d) a session
  uploads a `.mob` object to minio, (e) killing a worker PID → s6 respawns it,
  (f) `docker stop` exits gracefully within grace period (no SIGKILL).
- [x] 1.2 Run the smoke test against nothing / a stub and confirm it FAILS for
  the right reason (no bundle image yet).

## 2. Build the supervised bundle image

- [x] 2.1 `min-stack/bundle/Dockerfile`: multi-stage build from source mirroring
  `backend/Dockerfile` (go 1.26, `-tags dynamic`) for the 6 core binaries; final
  alpine stage extracts s6-overlay v3 tarballs, installs runtime deps
  (librdkafka/sasl/ca-certs), fetches geoip + uaparser data, `mkdir /mnt/efs`,
  and bakes the shared worker ENV.
- [x] 2.2 One `s6-rc` longrun per worker under `min-stack/bundle/s6-rc.d/<name>/`
  (run: `with-contenv` → `s6-envdir /work/env/<name>` → `/work/bin/<name>`).
  Shared config is the baked container ENV via `with-contenv`; an init oneshot
  (`build-envdirs.sh`) builds each per-worker envdir from the expanded
  `docker-envs/<name>.env`, adding `SERVICE_NAME` and an in-network
  `AWS_ENDPOINT`. Per-worker envdir overrides the shared ENV, resolving the
  `BUCKET_NAME` difference.
- [x] 2.3 Set `/init` (s6-overlay) as ENTRYPOINT; no tini/nohup.
- [x] 2.4 Build the image locally and confirm all 6 binaries + s6 tree present.

## 3. Compose wiring + Makefile

- [x] 3.1 `min-stack/docker-compose.bundle.yaml`: one `openreplay` service from
  the bundle image (aliased `http` for the Caddyfile), all COMMON_* + worker
  env, only http port exposed, plus the same infra + migration jobs + caddy CORS
  proxy as the multi-container stack.
- [x] 3.2 Add `up-bundle` / `down-bundle` / `logs-bundle` / `ps-bundle` /
  `smoke` / `capture` / `e2e` / `test-bundle` targets to `min-stack/Makefile`.

## 4. Prove with real data

- [x] 4.1 Bundle boots all six workers under s6; `smoke.sh` passes (200 + token,
  worker respawn on SIGKILL, graceful stop). A real browser session driven
  through the caddy CORS proxy (`:8095`) is accepted on every batch type and,
  after the tab is closed, lands in object storage as
  `mobs/<sessionID>/dom.mobs` (proven: session `3939466903324859650`).
- [ ] 4.1a Fix the automated Playwright harness (`bundle/e2e.sh` +
  `browtest/drive.mjs`): it posts to the worker directly via chromium
  `--disable-web-security`, which mis-shapes `visual` batches (400). Route it
  through the caddy proxy and drive session end so `make e2e` matches the
  proven manual flow.
- [x] 4.2 `make down-bundle` tears down clean (no leftover
  containers/volumes/networks).
- [x] 4.3 No Go source changed — the bundle builds the workers from the repo
  source unmodified; only deployment/packaging is added.
- [x] 4.4 Document steps, learnings and gotchas (`min-stack/bundle/README.md`).
