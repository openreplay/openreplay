BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.0'
$$ LANGUAGE sql IMMUTABLE;

ALTER TYPE public.error_source ADD VALUE IF NOT EXISTS 'elasticsearch';

ALTER TABLE public.metrics
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT TRUE;
COMMIT;