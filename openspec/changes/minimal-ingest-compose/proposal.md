## Why

The full OpenReplay docker-compose runs 19 application services, but only 6 are
required to ingest a browser session, cache its assets, process it, and upload
the replay to S3.
Contributors, CI, and local development need a slim stack that boots the core
ingest→process→upload pipeline without the analytics dashboard, integrations,
assist, spot, and other non-essential services — faster to boot, cheaper to run,
and easier to reason about.

## What Changes

- Add a new `docker-compose.minimal.yaml` that runs only the core ingest
  pipeline (FOSS / redisstream, no kafka, no license).
- Included application services: `http`, `ender`, `sink`, `storage`, `db`,
  `assets`.
- Included infrastructure: `postgresql`, `clickhouse`, `redis` (valkey),
  `minio` (S3-compatible object store).
- Included one-shot bootstrap jobs: `fs-permission`, `minio-migration`,
  `db-migration`, `clickhouse-migration`.
- Excluded (relative to full compose): `alerts`, `api`, `images`,
  `integrations`, `sourcemapreader`, `spot`, `assist`, `canvases`,
  `chalice`, `frontend`, `heuristics`, `nginx`, `caddy`.
- Document the ingest data-flow contract (topics, filesystem staging, S3
  layout) so the minimal stack has a verifiable behavior spec.

## Capabilities

### New Capabilities
- `minimal-ingest-pipeline`: The behavior contract for the minimal stack — which
  services run, how a session flows from HTTP ingest through queue topics to
  local `.mob` staging and finally to S3, and the shared infrastructure each
  worker depends on.

### Modified Capabilities
<!-- No existing specs in openspec/specs/; nothing modified. -->

## Impact

- **New file**: `scripts/docker-compose/docker-compose.minimal.yaml` (plus any
  minimal env files under `scripts/docker-compose/docker-envs/`).
- **Services**: cmd/http, cmd/ender, cmd/sink, cmd/storage, cmd/db, cmd/assets
  (FOSS images).
- **Infra images**: reuses existing postgres, clickhouse, valkey, minio images
  and migration jobs from the full compose.
- **Queue**: redisstream backend only (no kafka broker, no EE license service).
- **Networking**: HTTP ingest port exposed directly (no nginx/caddy reverse
  proxy in the minimal profile).
- **No changes** to Go source; this is a deployment/packaging change.
