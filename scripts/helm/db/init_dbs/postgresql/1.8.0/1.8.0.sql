BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.8.0'
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE IF EXISTS projects
    ADD COLUMN IF NOT EXISTS first_recorded_session_at timestamp without time zone NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sessions_last_check_at    timestamp without time zone NULL DEFAULT NULL;

COMMIT;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_unique_project_id_md5value_type_idx ON autocomplete (project_id, md5(value), type);

BEGIN;

DROP INDEX IF EXISTS autocomplete_unique;

COMMIT;