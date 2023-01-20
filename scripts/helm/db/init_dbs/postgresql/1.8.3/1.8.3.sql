BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.8.3'
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE IF EXISTS public.webhooks
    ALTER COLUMN type SET DEFAULT 'webhook';

ALTER TYPE webhook_type ADD VALUE IF NOT EXISTS 'msteams';

COMMIT;