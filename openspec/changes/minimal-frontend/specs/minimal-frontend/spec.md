## ADDED Requirements

### Requirement: Single-edge UI serving

The minimal stack SHALL serve the OpenReplay web UI and route API, ingest and
asset traffic through a single nginx edge exposed on one host port, so no
separate edge proxy or CORS shim is required.

#### Scenario: UI is served from the edge

- **WHEN** a browser requests `/` on the edge host port
- **THEN** the OpenReplay web UI (static assets) is returned with status 200

#### Scenario: API paths are proxied to the API services

- **WHEN** a request is made to `/api/...` on the edge
- **THEN** it is proxied to the `chalice` service
- **AND** a request to `/v2/api/...` is proxied to the `api` worker

#### Scenario: Asset paths are proxied to object storage

- **WHEN** a request is made to a session asset path (`/mobs`,
  `/sessions-assets`, `/sourcemaps`, or `/records`) on the edge
- **THEN** it is proxied to the object store

### Requirement: In-bundle API worker

The `api` service SHALL be built from the repository's Go source and run inside
the s6 bundle container as an additional supervised worker on a port distinct
from the `http` worker.

#### Scenario: api runs alongside the other workers

- **WHEN** the bundle container is started
- **THEN** a supervised `api` process is present in addition to the six ingest
  workers
- **AND** it listens on a port different from the `http` worker's port

#### Scenario: v2 API is reachable through the edge

- **WHEN** a client calls the `/v2/api` health/base path through the edge
- **THEN** the request reaches the `api` worker and returns a response (not a
  connection error)

### Requirement: Same-origin ingest

Session ingest SHALL be reachable at `/ingest` on the same edge origin as the
UI, so the tracker requires no cross-origin configuration.

#### Scenario: Tracker ingest works same-origin

- **WHEN** the tracker on a page served by the edge posts to `/ingest/v1/web/start`
- **THEN** the response status is 200 with a session token
- **AND** no cross-origin (CORS) proxy is involved

### Requirement: Login and replay

A user SHALL be able to log in to the UI and replay a previously captured
session whose recording is stored in object storage.

#### Scenario: Captured session replays

- **GIVEN** a session has been captured and its `dom.mobs` is in object storage
- **WHEN** the user logs in and opens that session in the UI
- **THEN** the UI fetches the recording through the edge asset routes and plays
  it back
