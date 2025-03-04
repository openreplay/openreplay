\set previous_version 'v1.18.0-ee'
\set next_version 'v1.19.0-ee'
SELECT openreplay_version()                       AS current_version,
       openreplay_version() = :'previous_version' AS valid_previous,
       openreplay_version() = :'next_version'     AS is_next
\gset

\if :valid_previous
\echo valid previous DB version :'previous_version', starting DB upgrade to :'next_version'
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
    ADD COLUMN IF NOT EXISTS normalized_x decimal NULL,
    ADD COLUMN IF NOT EXISTS normalized_y decimal NULL,
    DROP COLUMN IF EXISTS x,
    DROP COLUMN IF EXISTS y;

UPDATE public.metrics
SET default_config=default_config || '{"col":2}'
WHERE metric_type = 'webVitals'
  AND default_config ->> 'col' = '1';

UPDATE public.dashboard_widgets
SET config=config || '{"col":2}'
WHERE metric_id IN (SELECT metric_id
                    FROM public.metrics
                    WHERE metric_type = 'webVitals')
  AND config ->> 'col' = '1';

UPDATE public.metrics
SET view_type='table'
WHERE view_type = 'pieChart';

UPDATE public.metrics
SET view_type='lineChart'
WHERE view_type = 'progress';

UPDATE public.metrics
SET metric_type='heatMap',
    metric_of='heatMapUrl'
WHERE metric_type = 'clickMap';

UPDATE public.roles
SET permissions='{SERVICE_SESSION_REPLAY,SERVICE_DEV_TOOLS,SERVICE_ASSIST_LIVE,SERVICE_ASSIST_CALL,SERVICE_READ_NOTES}'
WHERE service_role;

UPDATE public.users
SET weekly_report= FALSE
WHERE service_account;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
