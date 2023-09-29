\set previous_version 'v1.12.0'
\set next_version 'v1.13.0'
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

ALTER TABLE IF EXISTS public.sessions
    ADD COLUMN IF NOT EXISTS user_city  text,
    ADD COLUMN IF NOT EXISTS user_state text;

COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_project_id_user_city_idx ON public.sessions (project_id, user_city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_project_id_user_state_idx ON public.sessions (project_id, user_state);

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif