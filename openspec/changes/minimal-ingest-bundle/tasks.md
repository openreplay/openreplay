## 1. TDD contract (tests FIRST — must fail before any image exists)

- [x] 1.1 Write a smoke test script `min-stack/bundle/smoke.sh` that asserts the
  spec scenarios: (a) one app container running, (b) all 6 worker processes
  present inside it, (c) `POST /v1/web/start` returns 200 + token, (d) a session
  uploads a `.mob` object to minio, (e) killing a worker PID → s6 respawns it,
  (f) `docker stop` exits gracefully within grace period (no SIGKILL).
- [x] 1.2 Run the smoke test against nothing / a stub and confirm it FAILS for
  the right reason (no bundle image yet).

## 2. Build the supervised bundle image

- [x] 2.1 `min-stack/bundle/Dockerfile`: repackage the published `*:v1.27.x`
  worker binaries (not a from-source build — HEAD's `split` requirement for
  visual batches is incompatible with the released tracker). Base on the release
  http image (runtime deps + geoip/uaparser present), extract s6-overlay v3
  tarballs, copy the other five worker binaries, `mkdir /mnt/efs`.
- [x] 2.2 One `s6-rc` longrun per worker under `min-stack/bundle/s6-rc.d/<name>/`
  (run: `with-contenv` → `s6-envdir /work/env/_shared` → `s6-envdir
  /work/env/<name>` → `/work/bin/<name>`). An init oneshot (`build-envdirs.sh`)
  builds a `_shared` envdir from `shared.env` (union of the six images' baked
  env) plus a per-worker envdir from each expanded `docker-envs/<name>.env`,
  adding `SERVICE_NAME` and an in-network `AWS_ENDPOINT`. Per-worker wins over
  `_shared`, resolving the `BUCKET_NAME` difference.
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
  worker respawn on SIGKILL, graceful stop). `make e2e` records a real
  Playwright-driven session and confirms `mobs/<sessionID>/dom.mobs` lands in
  object storage (proven: session `3939439628068007425`).
- [x] 4.2 `make down-bundle` tears down clean (no leftover
  containers/volumes/networks).
- [x] 4.3 No Go source changed — bundle repackages released binaries
  (deployment/packaging only).
- [x] 4.4 Document steps, learnings and gotchas (`min-stack/bundle/README.md`).
