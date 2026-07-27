## Why

The minimal stack today ingests sessions headlessly (workers + infra, no UI).
To actually log in and replay a captured session you need the OpenReplay web app
and its API tier. The full stack wires these behind a dedicated edge nginx plus
a static-only frontend nginx plus separate `api` and `chalice` services — more
moving parts than a minimal stack wants.

The frontend image is just nginx serving built static files, and its baked
`nginx.conf` does static only; the actual request routing lives in a separate
edge nginx. We can collapse that: give the frontend image one `nginx.conf` that
serves the UI *and* routes API/asset traffic, making it the single edge. That
removes the separate edge nginx and the CORS shim (ingest becomes same-origin
under `/ingest/`).

## What Changes

- Add the OpenReplay web UI to the minimal stack behind a single host port.
- Use the published `frontend` and `chalice` images as-is; override the
  frontend image's `nginx.conf` with one that serves the static UI and reverse
  proxies:
  - `/api/`     → `chalice:8000`
  - `/v2/api/`  → the bundle's `api` worker (`:8081`)
  - `/ingest/`  → the bundle's `http` worker (`:8080`)
  - `/mobs`, `/sessions-assets`, `/sourcemaps`, `/records` → `minio:9000`
- Build the `api` service from source (Go, `backend/cmd/api`) and add it to the
  s6 bundle as a 7th supervised worker, on its own port (`8081`) so it does not
  collide with the `http` worker on `8080`.
- Retire the caddy CORS proxy: the tracker's `ingestPoint` becomes the app's own
  origin (`/ingest`), so ingest is same-origin and needs no CORS.
- Add compose services + Makefile wiring for the UI stack.

## Capabilities

### New Capabilities
- `minimal-frontend`: Serve the OpenReplay web UI and route API, ingest and
  asset traffic through a single nginx edge, backed by the `api` (in-bundle) and
  `chalice` (published) services, so a user can log in and replay a captured
  session from one host port.

## Impact

- **New files**: `min-stack/frontend/nginx.conf` (edge + static),
  `min-stack/docker-compose.frontend.yaml` (or extend the bundle compose),
  frontend/chalice service defs, Makefile targets.
- **Bundle change**: build a 7th binary (`api`) and add its s6 service +
  per-worker envdir (`HTTP_PORT=8081`, placeholder `ASSIST_URL`).
- **Images**: `frontend:v1.27.17`, `chalice:v1.27.14` published; `api` built
  from this repo's source alongside the other workers.
- **Infra**: reuses postgres, clickhouse, redis, minio — no new infra.
- **Removed**: caddy CORS proxy from the UI stack (ingest is same-origin).
- **No Go/Python source changes** — packaging and routing only.
