BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.0-ee'
$$ LANGUAGE sql IMMUTABLE;

ALTER TYPE public.error_source ADD VALUE IF NOT EXISTS 'elasticsearch';
COMMIT;