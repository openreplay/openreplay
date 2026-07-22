## ADDED Requirements

### Requirement: Minimal service set

The minimal stack SHALL run exactly six application services — `http`,
`ender`, `sink`, `storage`, `db`, and `assets` — plus a `caddy` CORS proxy, and
MUST NOT include any of the excluded services (`alerts`, `api`, `images`,
`integrations`, `sourcemapreader`, `spot`, `assist`, `canvases`, `chalice`,
`frontend`, `heuristics`, `nginx`).

#### Scenario: Only core workers are defined

- **WHEN** `min-stack/docker-compose.yaml` is parsed
- **THEN** its `services` keys for application workers are exactly `http`,
  `ender`, `sink`, `storage`, `db`, `assets`
- **AND** none of the excluded service names appear as keys

#### Scenario: Required infrastructure is present

- **WHEN** `min-stack/docker-compose.yaml` is parsed
- **THEN** it defines infrastructure services `postgresql`, `clickhouse`,
  `redis`, and `minio`
- **AND** it defines bootstrap jobs `fs-permission`, `minio-migration`,
  `db-migration`, `clickhouse-migration`
- **AND** it defines a `caddy` CORS proxy in front of `http`

### Requirement: FOSS queue backend only

The minimal stack SHALL use the redisstream queue backend and MUST NOT define a
kafka broker or an EE license service.

#### Scenario: No kafka or license service

- **WHEN** `min-stack/docker-compose.yaml` is parsed
- **THEN** no service uses a kafka image
- **AND** no service references an EE license endpoint
- **AND** workers connect to the `redis` service for queue transport

### Requirement: Browser CORS support

Because the minimal stack excludes the nginx reverse proxy that injects CORS
headers in the full stack, it SHALL provide a proxy that adds the
`Access-Control-*` headers the tracker needs and forwards ingest to `http`.

#### Scenario: Preflight is answered

- **WHEN** a browser sends an `OPTIONS` preflight to the ingest endpoint from a
  different origin
- **THEN** the proxy responds `204` with `Access-Control-Allow-Origin`,
  `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`

#### Scenario: Cross-origin ingest succeeds

- **WHEN** a browser POSTs to `/v1/web/start` from a different origin
- **THEN** the response carries `Access-Control-Allow-Origin`
- **AND** the request is forwarded to `http` and returns a session token

### Requirement: Session ingest to queue

The `http` service SHALL accept SDK session traffic and produce raw messages to
the queue so downstream workers can consume them.

#### Scenario: Session start creates metadata and enqueues

- **WHEN** an SDK POSTs to `/v1/web/start`
- **THEN** `http` inserts a session row into Postgres
- **AND** subsequent batches POSTed to `/v1/web/i` are produced to the
  `TOPIC_RAW_WEB` topic keyed by session id

### Requirement: Default project bootstrap

Because the minimal stack excludes the services that create projects (`api`,
`chalice`, `frontend`), it SHALL provide a bootstrap step that seeds one
`projects` row so `http` accepts ingest.

#### Scenario: Ingest is rejected on an empty database

- **WHEN** no `projects` row exists
- **AND** an SDK POSTs to `/v1/web/start` with a project key
- **THEN** `http` rejects the request (no matching project)

#### Scenario: Seeded project unblocks ingest

- **WHEN** the bootstrap seeds a `projects` row with a known `project_key`
- **AND** an SDK POSTs to `/v1/web/start` with that key
- **THEN** `http` accepts the request and returns a session token

### Requirement: Replay staging to filesystem

The `sink` service SHALL consume raw web messages and write per-session `.mob`
replay files to the shared filesystem volume.

#### Scenario: Raw messages are written to mob files

- **WHEN** `sink` consumes messages for a session from `TOPIC_RAW_WEB`
- **THEN** it writes DOM data to `{sessionID}s` and `{sessionID}e` files on the
  shared volume

### Requirement: Asset caching and URL rewriting

The `assets` service SHALL cache session assets (CSS, JS, fonts) into the object
store and rewrite their URLs so replays render without depending on live
external origins.

#### Scenario: Sink flags asset references

- **WHEN** `sink` processes messages that reference external assets
- **THEN** it produces asset-cache messages to `TOPIC_CACHE`

#### Scenario: Assets are downloaded and rewritten

- **WHEN** `assets` consumes messages from `TOPIC_CACHE` or `TOPIC_RAW_ASSETS`
- **THEN** it downloads the referenced assets and stores them in the object
  store
- **AND** it re-produces the rewritten batch to `TOPIC_RAW_WEB` with asset URLs
  pointing at the cached copies

### Requirement: End-of-session upload trigger

When a session ends, the pipeline SHALL signal that its staged files are ready
for upload via the trigger topic.

#### Scenario: Ender detects idle session

- **WHEN** `ender` observes no new messages for a session past the idle timeout
- **THEN** it emits a SessionEnd message onto the raw-assets topic

#### Scenario: Sink signals upload readiness

- **WHEN** `sink` processes a SessionEnd message for a session
- **THEN** it produces a message to `TOPIC_TRIGGER` for that session id
- **AND** it closes the session's mob file writer

### Requirement: Upload to object storage

The `storage` service SHALL consume the trigger topic, compress the staged
replay files, and upload them to the S3-compatible object store.

#### Scenario: Compressed replay uploaded to S3

- **WHEN** `storage` consumes a `TOPIC_TRIGGER` message for a session
- **THEN** it reads the session's staged files from the shared volume
- **AND** compresses them with zstd (or encrypts them when an encryption key is
  present)
- **AND** uploads them to the object store under keys `{sessionID}/dom.mobs`
  and `{sessionID}/dom.mobe`

### Requirement: Session searchability

The `db` service SHALL consume raw and analytics messages and persist events to
ClickHouse so the ingested session is indexed and openable.

#### Scenario: Events persisted to ClickHouse

- **WHEN** `db` consumes messages for a session from `TOPIC_RAW_WEB` or
  `TOPIC_ANALYTICS`
- **THEN** it writes the corresponding session and event rows to ClickHouse

### Requirement: End-to-end verification

The minimal stack SHALL support an end-to-end smoke test proving a session can
be ingested and its replay retrieved from object storage.

#### Scenario: Ingested session lands in object storage

- **WHEN** the minimal stack is started and a synthetic session is ingested via
  the `http` endpoint and then allowed to end
- **THEN** the object store contains the session's `dom.mobs` object
- **AND** a session row exists in ClickHouse for that session id
