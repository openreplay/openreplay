## ADDED Requirements

### Requirement: Single supervised application container

The minimal ingest application tier SHALL be packaged as one container image
that runs all six core workers (`http`, `ender`, `sink`, `storage`, `db`,
`assets`) as supervised processes under a single PID 1 init, while the external
stateful infrastructure (postgres, clickhouse, redis, minio) runs outside the
container.

#### Scenario: All six workers run in one container

- **WHEN** the bundle container is started with valid infra connection env
- **THEN** exactly one application container is running
- **AND** a process for each of `http`, `ender`, `sink`, `storage`, `db`,
  `assets` is present inside that container

### Requirement: Per-process supervision and restart

The supervisor SHALL automatically restart any worker process that exits, so a
single worker crash does not permanently degrade the pipeline.

#### Scenario: A crashed worker is restarted

- **WHEN** one worker process inside the container is killed
- **THEN** the supervisor starts a new instance of that worker
- **AND** the container itself keeps running

### Requirement: Clean shutdown

The container SHALL forward termination signals to every worker so that
`docker stop` results in a graceful shutdown rather than a forced kill.

#### Scenario: docker stop terminates all workers gracefully

- **WHEN** the container receives SIGTERM via `docker stop`
- **THEN** every worker process receives the termination signal
- **AND** the container exits within the stop grace period without SIGKILL

### Requirement: Equivalent ingest behavior

The bundle SHALL produce the same ingest outcome as the multi-container minimal
stack: a browser session start is accepted and a completed session is uploaded
to S3.

#### Scenario: Session start is accepted

- **WHEN** a `POST /v1/web/start` is sent through the CORS proxy with a valid
  project key
- **THEN** the response status is 200
- **AND** the body contains a session token

#### Scenario: Completed session is uploaded to S3

- **WHEN** a session's messages are ingested and the session ends
- **THEN** a session artifact object appears in the S3 (minio) bucket under the
  session's key
