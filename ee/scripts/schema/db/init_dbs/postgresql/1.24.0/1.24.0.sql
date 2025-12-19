\set previous_version 'v1.23.0-ee'
\set next_version 'v1.24.0-ee'
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
FROM public.assist_events
WHERE event_id IN (SELECT DISTINCT event_id
                   FROM public.assist_events
                            LEFT JOIN public.projects USING (project_id)
                   WHERE projects.project_id IS NULL);

ALTER TABLE IF EXISTS public.assist_events
    ADD CONSTRAINT assist_events_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects (project_id) ON DELETE CASCADE;

DELETE
FROM public.assist_events_aggregates
WHERE project_id IN (SELECT DISTINCT assist_events_aggregates.project_id
                   FROM public.assist_events_aggregates
                            LEFT JOIN public.projects USING (project_id)
                   WHERE projects.project_id IS NULL);

ALTER TABLE IF EXISTS public.assist_events_aggregates
    ADD CONSTRAINT assist_events_aggregates_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects (project_id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.assist_records
    ALTER COLUMN user_id DROP NOT NULL;

DELETE
FROM public.sessions_videos
WHERE project_id IN (SELECT DISTINCT sessions_videos.project_id
                   FROM public.sessions_videos
                            LEFT JOIN public.projects USING (project_id)
                   WHERE projects.project_id IS NULL);

ALTER TABLE IF EXISTS public.sessions_videos
    ALTER COLUMN user_id DROP NOT NULL,
    ADD CONSTRAINT sessions_videos_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE SET NULL;

UPDATE public.roles
SET permissions = (SELECT array_agg(distinct e) FROM unnest(permissions || '{DATA_MANAGEMENT}') AS e)
WHERE NOT permissions @> '{DATA_MANAGEMENT}'
  AND NOT service_role;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
