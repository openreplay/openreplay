-- To fix a skipped version replacement from the previous release
SELECT openreplay_version() = 'v1.19.0'
           AND EXISTS (SELECT 1
                       FROM information_schema.tables
                       WHERE table_schema = 'spots'
                         AND table_name = 'tasks') AS valid_previous;
\gset
\if :valid_previous
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.20.0'
$$ LANGUAGE sql IMMUTABLE;
\endif

\set previous_version 'v1.20.0'
\set next_version 'v1.21.0'
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

ALTER TABLE IF EXISTS events.pages
    ADD COLUMN IF NOT EXISTS web_vitals text DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.session_integrations
(
    session_id bigint                      NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    project_id integer                     NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    provider   text                        NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (session_id, project_id, provider)
);

ALTER TABLE IF EXISTS public.metrics
    ALTER COLUMN user_id DROP NOT NULL,
    ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE IF EXISTS public.dashboards
    ALTER COLUMN user_id DROP NOT NULL,
    ALTER COLUMN project_id SET NOT NULL;

DELETE
FROM public.metrics
WHERE metric_of IN ('avgCpu', 'avgDomContentLoaded',
                    'avgDomContentLoadStart', 'avgFirstContentfulPixel',
                    'avgFirstPaint',
                    'avgFps', 'avgImageLoadTime',
                    'avgPageLoadTime', 'avgRequestLoadTime',
                    'avgResponseTime', 'avgSessionDuration',
                    'avgTillFirstByte', 'avgTimeToRender')
   or metric_of IN ('timeToRender', 'cpu', 'crashes'
    'fps', 'avgTimeToInteractive',
                    'avgPagesResponseTime', 'avgUsedJsHeapSize',
                    'memoryConsumption', 'pagesResponseTime',
                    'pagesDomBuildtime', 'pagesResponseTimeDistribution',
                    'resourcesVsVisuallyComplete', 'sessionsPerBrowser',
                    'slowestDomains', 'speedLocation', 'impactedSessionsBySlowPages',
                    'avgPagesDomBuildtime')
   or metric_of IN ('missingResources', 'resourcesLoadingTime',
                    'slowestResources', 'callsErrors', 'resourceTypeVsResponseEnd',
                    'resourcesCountByType');

DELETE
FROM public.alerts
WHERE query ->> 'left' IN ('performance.image_load_time.average', 'performance.request_load_time.average',
                           'resources.load_time.average', 'resources.missing.count',
                           'errors.4xx_5xx.count', 'errors.4xx.count',
                           'errors.5xx.count', 'errors.javascript.impacted_sessions.count');

DROP TABLE IF EXISTS events.resources;
DROP TYPE IF EXISTS events.resource_type;
DROP TYPE IF EXISTS events.resource_method;

ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'dynatrace';

UPDATE users SET settings=COALESCE(settings, '{}'::jsonb) || '{
  "modules": [
    "usability-tests",
    "feature-flags"
  ]
}'::jsonb
WHERE settings IS NULL
   OR settings -> 'modules' IS NULL;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
