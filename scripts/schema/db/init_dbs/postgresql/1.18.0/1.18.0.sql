\set previous_version 'v1.17.0'
\set next_version 'v1.18.0'
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
DROP FUNCTION IF EXISTS events.funnel(steps integer[], m integer);

ALTER TABLE IF EXISTS public.sessions
    ADD COLUMN IF NOT EXISTS screen_width  integer DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS screen_height integer DEFAULT NULL;

CREATE INDEX IF NOT EXISTS graphql_session_id_idx ON events.graphql (session_id);
CREATE INDEX IF NOT EXISTS crashes_session_id_idx ON events_common.crashes (session_id);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
