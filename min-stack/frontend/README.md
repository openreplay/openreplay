# Minimal UI stack

Adds the OpenReplay web UI to the minimal stack behind a **single nginx edge**,
so you can log in and replay a captured session from one host port. Builds on
the s6 bundle; adds the Go `api` worker into the bundle and the published
`frontend` + `chalice` images.

```
   browser :9000                nginx edge (frontend image + our nginx.conf)
 ┌──────────────┐             ┌──────────────────────────────────────────────┐
 │  UI + login  │──GET / ─────▶│  /          static UI  (/var/www/openreplay) │
 │              │             │  /api/      → chalice:8000   (published)      │
 │  tracker on  │──/api ──────▶│  /v2/api/   → openreplay:8081 (api, bundle)  │
 │  /testpage/  │──/v2/api────▶│  /ingest/   → openreplay:8080 (http, bundle) │
 │              │──/ingest────▶│  /mobs …    → minio:9000 (Host forwarded)    │
 └──────────────┘             └──────────────────────────────────────────────┘
   bundle (s6, one container): http:8080 ender sink storage db assets api:8081
   published: chalice:8000, frontend(edge+UI) ;  infra: pg · ch · redis · minio
```

## Quick start

```sh
cd min-stack
cp common.env.example common.env

make up-ui       # build bundle image (+api), boot UI+infra, seed a project
                 # UI:  http://localhost:9000/
make smoke-ui    # routing + same-origin ingest checks
make e2e-ui      # signup -> capture -> replay recording fetched via the edge
make down-ui     # teardown + volumes
```

## Log in and replay (manual)

1. Open `http://localhost:9000/`, click **Sign up**, create the first account
   (email must use a real domain, e.g. `admin@example.com`; `.local` is
   rejected). The first signup creates the tenant and a default project.
2. Capture a session: open `http://localhost:9000/testpage/`, interact, then
   **close the tab** (a session only ends after the tracker stops beaconing).
3. Wait ~2.5 min for `ender` to end the session and `storage` to upload it.
4. In the UI, open the session and play it back.

## How replay resolves (data path)

```
frontend player ──▶ GET /v2/api/<proj>/sessions/<sid>/first-mob   (Go api worker)
                 ◀── { domURL: [ <presigned>/mobs/<sid>/dom.mobs?X-Amz-... ] }
frontend player ──▶ GET /mobs/<sid>/dom.mobs?X-Amz-...  (same origin, via edge)
                    nginx forwards Host = object-store internal host
                 ◀── zstd dom.mobs recording  (S3 v4 signature validates)
```

`make e2e-ui` automates and asserts exactly this.

## Design notes / learnings

- **api is built from source into the bundle** (7th s6 worker) on `HTTP_PORT=8081`
  to avoid the `http` worker's 8080. It serves `/v2/api`, including the web
  replay endpoint (`.../first-mob`).
- **Replay goes through the Go api, not chalice.** The HEAD storage worker writes
  the nested `mobs/<sid>/dom.mobs` layout and the HEAD api reads it. Published
  chalice's default flat mob-key (`<sid>`) is a legacy path and is not used for
  web replay here — mixing HEAD backend with published chalice is fine for login
  because replay is served by the (HEAD) api.
- **Single edge = frontend image + our `nginx.conf`.** We override the image's
  `conf.d/default.conf` and blank its stock `nginx.default.conf` (both otherwise
  `listen 8080`). `/` is served locally; other paths proxy. Dynamic upstreams
  use `resolver 127.0.0.11`.
- **Same-origin ingest, no caddy.** The tracker posts to `/ingest` on the app
  origin, so no CORS proxy is needed; caddy is parked on the `legacy-caddy`
  profile in the bundle compose.

## Gotchas

- **Presigned asset Host (403 if wrong).** The api signs `/mobs` URLs with its
  `AWS_ENDPOINT` = the object store's *internal* host. The browser fetches them
  same-origin through the edge, so the nginx asset location does
  `proxy_set_header Host <internal-host>` — otherwise the S3 v4 signature
  (`SignedHeaders=host`) fails with 403.
- **Signup email domain.** `.local` and other reserved domains are rejected by
  the API's email validator; use e.g. `example.com`.
- **Single-tenant OSS.** `get_projects` has no tenant filter, so every project
  (including the CLI-seeded `testkey0000000000001`) is visible to the logged-in
  user.
- **api `ASSIST_URL` is a placeholder.** Live assist/co-browse is out of scope;
  only those features would need a real assist service. Replay does not.
- **Session end needs the tab closed** (tracker heartbeats keep it alive) and
  upload lags ~2.5 min behind the last beacon.
