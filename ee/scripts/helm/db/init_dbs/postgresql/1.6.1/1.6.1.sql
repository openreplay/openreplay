BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.6.1-ee'
$$ LANGUAGE sql IMMUTABLE;


ALTER TABLE IF EXISTS dashboards
    ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';


CREATE INDEX IF NOT EXISTS traces_created_at_idx ON traces (created_at);
COMMIT;