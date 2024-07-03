\set previous_version 'v1.19.0'
\set next_version 'v1.18.0'
SELECT openreplay_version()                       AS current_version,
       openreplay_version() = :'previous_version' AS valid_previous,
       openreplay_version() = :'next_version'     AS is_next
\gset

\if :valid_previous
\echo valid previous DB version :'previous_version', starting DB downgrade to :'next_version'
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
    ADD COLUMN IF NOT EXISTS x integer DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS y integer DEFAULT NULL;

UPDATE public.metrics
SET metric_type='clickMap',
    metric_of='clickMapUrl'
WHERE metric_type = 'heatMap';

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB downgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif