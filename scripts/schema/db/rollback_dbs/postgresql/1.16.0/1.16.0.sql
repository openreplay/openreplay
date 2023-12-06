\set previous_version 'v1.16.0'
\set next_version 'v1.15.0'
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

DROP TABLE IF EXISTS events.canvas_recordings;

ALTER TABLE IF EXISTS public.sessions
    ADD COLUMN IF NOT EXISTS user_agent text DEFAULT NULL,
    ADD CONSTRAINT web_user_agent_constraint CHECK (
            (sessions.platform = 'web' AND sessions.user_agent NOTNULL) OR
            (sessions.platform != 'web' AND sessions.user_agent ISNULL));

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB downgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif