BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.2'
$$ LANGUAGE sql IMMUTABLE;

COMMIT;