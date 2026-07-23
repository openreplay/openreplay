## 1. TDD contract (tests FIRST — must fail before any image exists)

- [ ] 1.1 Write a smoke test script `min-stack/bundle/smoke.sh` that asserts the
  spec scenarios: (a) one app container running, (b) all 6 worker processes
  present inside it, (c) `POST /v1/web/start` returns 200 + token, (d) a session
  uploads a `.mob` object to minio, (e) killing a worker PID → s6 respawns it,
  (f) `docker stop` exits gracefully within grace period (no SIGKILL).
- [ ] 1.2 Run the smoke test against nothing / a stub and confirm it FAILS for
  the right reason (no bundle image yet).

## 2. Build the supervised bundle image

- [ ] 2.1 `min-stack/bundle/Dockerfile`: multi-stage — reuse golang build stage
  to compile only the 6 core binaries; final alpine stage extracts s6-overlay v3
  tarballs (arch-matched), installs runtime deps (librdkafka, sasl, ca-certs),
  downloads uaparser + geoip data.
- [ ] 2.2 Create one `s6-rc` longrun service dir per worker under
  `min-stack/bundle/s6-rc.d/<name>/` (type + run script `exec /work/bin/<name>`)
  and add each to the `user` bundle contents.
- [ ] 2.3 Set `/init` (s6-overlay) as ENTRYPOINT; remove tini/nohup.
- [ ] 2.4 Build the image locally and confirm all 6 binaries + s6 tree present.

## 3. Compose wiring + Makefile

- [ ] 3.1 `min-stack/docker-compose.bundle.yaml`: one `openreplay` service from
  the bundle image, all COMMON_* + worker env, only http port exposed, plus the
  same infra + migration jobs + caddy CORS proxy as the multi-container stack.
- [ ] 3.2 Add `up-bundle` / `down-bundle` targets to `min-stack/Makefile`
  (build workdir, envsubst, compose up with migration profile, seed, wait).

## 4. Prove with real data

- [ ] 4.1 Boot the bundle stack; run `smoke.sh` and confirm every scenario PASSES
  (200 + token, .mob in S3, worker respawn, graceful stop).
- [ ] 4.2 Tear down clean (no leftover containers/volumes/networks).
- [ ] 4.3 Confirm no Go source changed (deployment/packaging only).
