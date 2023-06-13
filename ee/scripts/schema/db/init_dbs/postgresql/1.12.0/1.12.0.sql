\set previous_version 'v1.11.0-ee'
\set next_version 'v1.12.0-ee'
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
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'app_crash';

CREATE TABLE IF NOT EXISTS public.projects_stats
(
    project_id     integer NOT NULL,
    created_at     timestamp        default (now() AT TIME ZONE 'utc'::text),
    sessions_count integer NOT NULL DEFAULT 0,
    events_count   bigint  NOT NULL DEFAULT 0,
    last_update_at timestamp        default (now() AT TIME ZONE 'utc'::text),
    primary key (project_id, created_at)
);

CREATE INDEX IF NOT EXISTS projects_stats_project_id_idx ON public.projects_stats (project_id);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif