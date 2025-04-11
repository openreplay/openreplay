\set previous_version 'v1.21.0-ee'
\set next_version 'v1.22.0-ee'
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

DELETE
FROM public.metrics
WHERE metrics.metric_type = 'insights';

DROP TABLE IF EXISTS public.user_favorite_errors;
DROP TABLE IF EXISTS public.user_viewed_errors;

ALTER TABLE IF EXISTS public.sessions_notes
    ADD COLUMN IF NOT EXISTS start_at   integer,
    ADD COLUMN IF NOT EXISTS end_at     integer,
    ADD COLUMN IF NOT EXISTS thumbnail  text,
    ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NULL,
    ALTER COLUMN message DROP NOT NULL;

DELETE
FROM public.metrics
WHERE metric_of IN ('domainsErrors4xx', 'domainsErrors5xx', 'countSessions',
                    'countRequests', 'errorsPerDomains', 'errorsPerType',
                    'impactedSessionsByJsErrors', 'resourcesByParty', 'userOs',
                    'speedLocation', 'avgVisitedPages')
   OR metric_type IN ('webVitals', 'errors', 'performance', 'resources');

UPDATE public.metrics
SET view_type='chart'
WHERE metric_type = 'funnel';

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
