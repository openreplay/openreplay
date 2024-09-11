\set previous_version 'v1.19.0'
\set next_version 'v1.20.0'
SELECT openreplay_version()                       AS current_version,
       openreplay_version() = :'previous_version' AS valid_previous,
       openreplay_version() = :'next_version'     AS is_next
\gset

\if :valid_previous
\echo valid previous DB version :'previous_version', starting DB upgrade to :'next_version'
BEGIN;
SELECT format($fn_def$
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT '%1$s'
$$ LANGUAGE sql IMMUTABLE;
$fn_def$, :'next_version')
\gexec

--
ALTER TABLE IF EXISTS events.clicks
    ALTER COLUMN normalized_x SET DATA TYPE decimal,
    ALTER COLUMN normalized_y SET DATA TYPE decimal;

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS spot_jwt_iat         timestamp without time zone NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS spot_jwt_refresh_jti integer                     NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS spot_jwt_refresh_iat timestamp without time zone NULL DEFAULT NULL;

CREATE SCHEMA IF NOT EXISTS or_cache;
CREATE TABLE IF NOT EXISTS or_cache.autocomplete_top_values
(
    project_id     integer                                        NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    event_type     text                                           NOT NULL,
    event_key      text                                           NULL,
    result         jsonb                                          NULL,
    execution_time integer                                        NULL,
    created_at     timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE NULLS NOT DISTINCT (project_id, event_type, event_key)
);

ALTER TABLE IF EXISTS public.tenants
    ADD COLUMN IF NOT EXISTS scope_state smallint NOT NULL DEFAULT 2;

ALTER TABLE IF EXISTS public.tenants
    ALTER COLUMN scope_state SET DEFAULT 0;

ALTER TABLE IF EXISTS public.users
    ALTER COLUMN settings SET DEFAULT '{
      "modules": [
        "usability-tests",
        "feature-flags"
      ]
    }'::jsonb;

CREATE SCHEMA IF NOT EXISTS spots;

CREATE TABLE IF NOT EXISTS spots.spots
(
    spot_id    BIGINT                      NOT NULL PRIMARY KEY,
    name       TEXT                        NOT NULL,
    user_id    BIGINT                      NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    tenant_id  BIGINT                      NOT NULL,
    duration   INT                         NOT NULL,
    crop       INT[],
    comments   TEXT[],
    status     TEXT                                 DEFAULT 'pending',
    created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp                            DEFAULT NULL,
    deleted_at timestamp                            DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS spots.keys
(
    spot_key   TEXT      NOT NULL PRIMARY KEY,
    spot_id    BIGINT    NOT NULL UNIQUE REFERENCES spots.spots (spot_id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL,
    expiration BIGINT    NOT NULL,
    expired_at timestamp NOT NULL,
    created_at timestamp NOT NULL,
    updated_at timestamp DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS spots.streams
(
    spot_id           BIGINT    NOT NULL PRIMARY KEY REFERENCES spots.spots (spot_id) ON DELETE CASCADE,
    original_playlist TEXT      NOT NULL,
    modified_playlist TEXT      NOT NULL,
    created_at        timestamp NOT NULL,
    expired_at        timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS spots.tasks
(
    spot_id    BIGINT    NOT NULL PRIMARY KEY REFERENCES spots.spots (spot_id) ON DELETE CASCADE,
    duration   INT       NOT NULL,
    crop       INT[],
    status     TEXT      NOT NULL,
    error      TEXT DEFAULT NULL,
    added_time timestamp NOT NULL
);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
