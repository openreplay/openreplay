BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.8.2'
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE IF EXISTS public.tenants
    ADD COLUMN IF NOT EXISTS last_telemetry bigint NOT NULL DEFAULT CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT);
COMMIT;