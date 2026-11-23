# OpenReplay threat model

## What this project does and where untrusted input enters

OpenReplay is a self-hosted session replay platform. A JavaScript tracker (`tracker/`) runs on our users' websites,
records the DOM, network calls, console and user events of every visitor, and sends them to the ingest services. The
dashboard (`frontend/`, with the replay engine in `player/`) replays those sessions to the site owner's team.

Two different groups of people send data to an instance, and neither is trusted:

- **Visitors of a tracked website.** The `projectKey` is embedded in the site's public JavaScript, so anyone on the
  internet can start sessions and push arbitrary recordings. Treat everything that arrives through
  `/ingest/*` (go `http`, `images`, `canvases` workers) as attacker-controlled: messages, DOM snapshots, URLs, headers,
  canvas frames, uploaded files. That data is processed by `ender`, `sink`, `storage`, `db`, `assets` and is later
  rendered in the dashboard to the site owner.
- **Dashboard users.** Owner, admin and member roles within one organisation (`api/`, the python "chalice" API, and
  the go `api` and `spot` services). A finding has to cross a boundary the product claims to enforce.

Boundaries we care about:

- unauthenticated to anything: login, signup (only before the first account exists), password reset, invitation
  acceptance (`api/routers/core*.py` `public_app` routes), tracker ingest, the assist websocket, shared spot links
- a recorded session to the dashboard user who replays it: stored XSS or script execution through replayed DOM,
  CSS, network bodies, console output or canvas data, escaping the player's sandboxing (`player/src/web`,
  `player/src/web/managers/DOM/sanitize.ts`)
- the tracker on a customer's website: anything that lets a third party run script on that site through the tracker,
  `tracker-assist` or the assist server, or that records data the tracker claims to mask (input obscuring and
  sanitisation in `tracker/tracker/src/main/app/sanitizer.ts`)
- live assist: joining, watching or remote-controlling a live session without a valid agent token, or without the
  visitor's consent where the tracker asks for it (`assist/`, `tracker/tracker-assist`)
- member to admin/owner, and a project API key (`app_apikey` routes, e.g. sourcemap upload) to more than its project
- server-side requests to the internal network: the `assets` worker fetches URLs taken from recordings
  (guarded in `backend/internal/assets/cacher/netguard.go`), `sourcemapreader` fetches sourcemaps, webhooks and
  Slack/MS Teams integrations (`api/chalicelib/core/collaborations`)
- user-controlled values spliced into SQL (Postgres via `api/chalicelib`, ClickHouse queries in `api/chalicelib` and
  `backend/pkg/analytics`), or into object storage keys and file paths (`storage`, `sink`, `FS_DIR`)

## Components that matter most / least

Most: ingest and session start (`backend/pkg/sessions/api`, `backend/internal/http`), the player and dashboard paths
that render recorded content, authentication and authorization in `api/auth`, `api/or_dependencies.py`,
`api/chalicelib/core/authorizers.py`, `backend/pkg/server/auth`, the assist server, the asset cacher and
sourcemapreader fetchers, and query building over user filters (`api/chalicelib/core/sessions`, `metrics`,
`backend/pkg/analytics`).

In scope, lower priority: the tracker plugins (`tracker/tracker-*` other than `tracker-assist`), `spot/` (browser
extension), `mcp_app/`, `sourcemap-uploader/`, `networkProxy/`.

Out of scope: `ee/` (enterprise edition, not built here; multi-tenant isolation lives there), deployment and ops
material (`scripts/`, `min-stack/`, Helm charts, docker-compose files), `docs/`, `static/`, `openspec/`,
`tracker/tracker-testing-playground`, test fixtures. Secrets and default passwords set by this image
(`.oss-scanner/Dockerfile`) are test values, not findings.

## How to exercise it

- `or-start` starts the bundled stores and every service; the edge is `http://127.0.0.1/`. Logs are in
  `/var/log/openreplay/<service>.log`. `or-db start|stop` runs the stores alone.
- Login: `admin@example.com` / `Password123!`, the owner, with one project already created. A finding demonstrated
  only as the owner is usually not one: create a member with `POST /api/client/members`
  (`{"email":..,"name":..,"admin":false}`), follow the returned `invitationLink` (its redirect carries `invitation`
  and `pass`), then `POST /api/password/reset` with `{"invitation","pass","password"}` and log in as the member.
- Edge routes: `/api/*` chalice (:8000), `/v2/api/*` go api (:8081), `/ingest/*` http worker (:8080),
  `/spot/*` (:8082), `/ws-assist/*` assist (:9001), object storage (rustfs, :9300) under `/mobs`, `/sessions-assets`,
  `/sourcemaps` and the other buckets. Postgres `postgres://postgres:changeme@127.0.0.1:5432/postgres`, ClickHouse
  `127.0.0.1:9000` (user `default`, no password), valkey `127.0.0.1:6379`.
- A session from the tracker's point of view: `POST /ingest/v1/web/start` with the project's `projectKey` (from
  `GET /api/projects`) and a browser `User-Agent` returns a session token; batches go to `POST /ingest/v1/web/i`.
- Go workers: sources in `/src/backend`, binaries in `/src/backend/bin`, built with debug info. After a patch:
  `cd /src/backend && go build -o bin/<worker> ./cmd/<worker>`, then kill the running worker: `or-start` restarts it.
  Tests: `go test -vet=off ./...` (the module cache is offline). Known failures when this was written, not findings:
  `internal/http/geoip` (test does not build) and two tests in `pkg/analytics/cards`. Without `-vet=off`,
  `pkg/server/auth`, `internal/config/configurator` and `pkg/replays/service` also fail vet.
- Python API: `/src/api`, virtualenv `/opt/venv`. It has no test suite; reload by killing uvicorn.
- Node services: `/src/assist`, `/src/sourcemapreader` (dependencies installed). The frontend and player are built
  into `/src/frontend/public`; their dependencies are not in the image, so they cannot be rebuilt offline. Read
  `player/` and `frontend/` sources directly.
- Not built: `ee/`, the mobile trackers, the `spot/` extension.

## How we rate severity

<!-- DRAFT, to be confirmed by the OpenReplay team -->
- **Critical**: unauthenticated code execution on any service; unauthenticated read of other users' session
  recordings or account takeover; script execution on a customer's website through the tracker or assist; joining
  or controlling a live session without authorization.
- **High**: stored XSS in the dashboard triggered by replaying a session (attacker is any visitor of a tracked site);
  SQL injection or SSRF reaching internal services, needing at most a member account or a projectKey; a member
  gaining admin/owner capabilities; the tracker capturing data it is configured to mask.
- **Medium**: SSRF without a meaningful internal target, information disclosure across a role boundary that does not
  include recordings or credentials, XSS that needs unusual interaction, denial of service of the ingest path by a
  single unauthenticated client.
- **Low**: everything else, including issues needing owner privileges, missing hardening headers, and user
  enumeration.

## Anything to leave alone

- An owner or admin seeing every session of their own organisation is the product.
- The public `projectKey` is meant to be public; starting sessions with it is not a finding on its own.
- Recordings that contain what the site owner chose not to mask are their configuration, not a tracker bug.
