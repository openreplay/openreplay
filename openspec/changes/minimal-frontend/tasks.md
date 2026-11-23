## 1. TDD contract (tests FIRST — must fail before wiring)

- [x] 1.1 Extend a smoke/e2e script to assert the spec scenarios: (a) `GET /`
  returns the UI (200 + html), (b) `/api/` reaches chalice, (c) `/v2/api/`
  reaches the api worker, (d) an asset path proxies to minio, (e)
  `/ingest/v1/web/start` returns 200 + token same-origin, (f) a supervised `api`
  process exists in the bundle on a non-8080 port.
- [x] 1.2 Run against the current (UI-less) stack and confirm it FAILS for the
  right reasons.

## 2. Add `api` to the s6 bundle (build from source)

- [x] 2.1 Add `api` to the bundle Dockerfile build loop (7 binaries now).
- [x] 2.2 Add an s6 longrun service dir `s6-rc.d/api` (run: `with-contenv` →
  `s6-envdir /work/env/api` → `/work/bin/api`).
- [x] 2.3 In `build-envdirs.sh`, build the `api` envdir from
  `docker-envs/api.env` plus `SERVICE_NAME=api`, `HTTP_PORT=8081`, in-network
  `AWS_ENDPOINT`, and a placeholder `ASSIST_URL`.
- [x] 2.4 Rebuild; confirm 7 workers up under s6 and `api` listens on 8081.

## 3. Edge nginx (frontend image + our nginx.conf)

- [x] 3.1 Write `min-stack/frontend/nginx.conf`: serve static UI from
  `/var/www/openreplay` and reverse proxy `/api/`→chalice:8000,
  `/v2/api/`→openreplay:8081, `/ingest/`→openreplay:8080, and the asset paths
  (`/mobs`, `/sessions-assets`, `/sourcemaps`, `/records`)→minio:9000.
- [x] 3.2 Add frontend (published image + mounted nginx.conf) and chalice
  (published image + `docker-envs/chalice.env`) as compose services on one host
  port; reuse existing infra + migrations.

## 4. Wire, retire caddy, prove

- [x] 4.1 Point the tracker test page `ingestPoint` at the edge origin
  (`/ingest`); drop the caddy CORS proxy and `__DISABLE_SECURE_MODE` from the UI
  flow. Add Makefile targets (e.g. `up-ui` / `down-ui`).
- [x] 4.2 Boot; run the smoke/e2e and confirm every scenario PASSES.
- [x] 4.3 Manual proof: log in, capture a session from the served page, and
  replay it in the UI (recording fetched via the edge → minio).
- [x] 4.4 Tear down clean; confirm no Go/Python source changed.
- [x] 4.5 Document the UI stack in `min-stack/` docs (ports, login, replay,
  gotchas: api ASSIST_URL placeholder, published-vs-source version skew).

## Notes (as-built)

- Proven fully automated by `make e2e-ui`: signup -> capture via the edge test
  page -> session written to postgres + clickhouse -> `dom.mobs` uploaded to the
  nested `mobs/<sid>/dom.mobs` key -> `/v2/api/<proj>/sessions/<sid>/first-mob`
  presigned URL -> recording fetched back through the edge as a zstd mob
  (e.g. session `3945433330443418114`).
- Replay is served by the Go `api` worker (`/v2/api/.../first-mob`), matching the
  HEAD storage worker's nested mob layout. Published chalice's flat mob-key
  default is not on the web replay path.
- The api signs presigned asset URLs with its `AWS_ENDPOINT`, and presigning is
  a local no-network op, so `AWS_ENDPOINT` for the api worker is set to the
  public edge origin (`OR_PUBLIC_ORIGIN`) rather than the object store's internal
  service name (which a browser cannot resolve). The nginx asset location
  forwards the browser `Host` (`$http_host`) to the store so the S3 v4 signature
  (SignedHeaders=host) validates. Upload workers keep the internal endpoint.
  This mirrors the full stack, where `api.env` sets
  `AWS_ENDPOINT=${COMMON_PROTOCOL}://${COMMON_DOMAIN_NAME}`.
