BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.8.0'
$$ LANGUAGE sql IMMUTABLE;

COMMIT;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_unique_m ON autocomplete (project_id, md5(value), type);

BEGIN;

DROP INDEX IF EXISTS autocomplete_unique;
ALTER INDEX IF EXISTS autocomplete_unique_m RENAME TO autocomplete_unique;

COMMIT;