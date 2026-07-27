## Context

The bundle (`minimal-ingest-bundle`) runs the six ingest workers under s6 and
proves ingest→S3. It has no UI: you cannot log in or replay. The full stack
serves the UI through three layers — a dedicated edge nginx, a static-only
frontend nginx, and separate `api`/`chalice` API services — which is more than a
minimal stack needs.

Findings from the codebase:
- `frontend` published image = nginx serving built static from
  `/var/www/openreplay`; its baked `nginx.conf` is static-only.
- Request routing (which path goes to which service) lives in a *separate* edge
  `nginx.conf` (`scripts/docker-compose/nginx.conf`).
- `api` is a **Go** service (`backend/cmd/api`, imports `pkg/api`, pg, ch,
  redis, objectstorage) — the shared backend codebase. Listens on `HTTP_PORT`.
- `chalice` is a **Python** FastAPI/uvicorn service (`api/` dir), `LISTEN_PORT`
  8000, served under `/api/`.

## Goals / Non-Goals

**Goals:**
- Log in to the OpenReplay UI and replay a captured session, from one host port.
- Single nginx edge = the frontend image + our `nginx.conf` (static + routing).
- `api` built from source and supervised inside the existing s6 bundle.
- Same-origin ingest (`/ingest`) — drop the caddy CORS shim.

**Non-Goals:**
- Live assist / co-browse / spot (needs assist services; replay does not).
- EE features (SAML, SCIM, captcha, email) — optional chalice surface, skipped.
- TLS/ACME (the full stack's caddy handled that; local is plain http).
- Bundling chalice/frontend into the s6 container (they stay separate images).

## Decisions

### One nginx edge = frontend image + our nginx.conf
Instead of a separate edge nginx + static frontend nginx, mount a single
`nginx.conf` into the published frontend image that both serves the static UI
and reverse-proxies. This is the user's insight: the frontend is already nginx,
so fold the routing in.

```
                     ┌──── frontend nginx (edge + UI) : single host port ────┐
   browser ─────────▶│  /          → static UI (/var/www/openreplay)         │
                     │  /api/      → chalice:8000       (published)          │
                     │  /v2/api/   → openreplay:8081    (api, in bundle)     │
                     │  /ingest/   → openreplay:8080    (http, in bundle)    │
                     │  /mobs /sessions-assets /sourcemaps /records → minio  │
                     └────────────────────────────────────────────────────────┘
```

### api joins the s6 bundle as the 7th worker
`api` is Go and shares the backend build, so add it to the bundle's build loop
and give it an s6 longrun service. It is a long-running HTTP server like `http`.

**Port collision:** both `http` and `api` default to `HTTP_PORT=8080`. In one
container that collides. The per-worker s6 envdir solves it: `api`'s envdir sets
`HTTP_PORT=8081`; `http` keeps `8080`. nginx routes `/v2/api/`→8081,
`/ingest/`→8080.

**ASSIST_URL required:** the api config marks `ASSIST_URL` required. Assist is
out of scope, so set a placeholder; only live-assist endpoints would fail, not
replay.

### Same-origin ingest, retire caddy
With everything behind one nginx, the tracker's `ingestPoint` = the app origin
and beacons go to `/ingest` on the same origin — no CORS, no
`__DISABLE_SECURE_MODE` hack, no caddy. This matches production (where caddy only
did TLS/ACME, not CORS).

### Published images for frontend + chalice, source build for api
Per direction: `frontend` and `chalice` are used as published images (UI static
and the Python API rarely diverge from the tracker protocol). `api` is built
from this repo's source with the other Go workers, keeping the bundle's
build-from-source property and one shared Go toolchain pass.

## Risks / Trade-offs

- **api ASSIST_URL placeholder**: live features error if hit; acceptable
  (replay-focused). Mitigation: document it.
- **chalice EE env surface**: many optional vars (SAML/SCIM/email). Mitigation:
  feed `docker-envs/chalice.env` with blank/defaults; prove login only.
- **Version skew frontend/chalice (published) vs api (source HEAD)**: the API
  contract between UI and api could drift. Mitigation: pin published tags close
  to HEAD; the replay path is stable. If drift bites, build frontend/chalice
  from source too (deferred).
- **One nginx = one failure point** for UI+routing. Acceptable for minimal.
- **Losing caddy** removes TLS; fine for local, revisit for any exposed deploy.
