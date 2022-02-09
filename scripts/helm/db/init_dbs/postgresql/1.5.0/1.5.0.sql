BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.0'
$$ LANGUAGE sql IMMUTABLE;


ALTER TABLE public.metrics
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT TRUE;
COMMIT;
ALTER TYPE public.error_source ADD VALUE IF NOT EXISTS 'elasticsearch'; -- cannot add new value inside a transaction block