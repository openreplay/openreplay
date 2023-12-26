\set previous_version 'v1.16.0'
\set next_version 'v1.17.0'
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
    ADD COLUMN IF NOT EXISTS has_ut_test boolean DEFAULT FALSE;

-- !!! The following query takes a lot of time
CREATE INDEX IF NOT EXISTS sessions_session_id_has_ut_test_idx ON public.sessions (session_id, has_ut_test);

UPDATE public.sessions
SET has_ut_test= TRUE
WHERE session_id IN (SELECT session_id FROM public.ut_tests_signals);

DROP INDEX IF EXISTS public.errors_error_id_idx;
DROP INDEX IF EXISTS public.issues_issue_id_idx;
DROP INDEX IF EXISTS public.user_favorite_sessions_user_id_session_id_idx;
DROP INDEX IF EXISTS public.projects_project_key_idx;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
