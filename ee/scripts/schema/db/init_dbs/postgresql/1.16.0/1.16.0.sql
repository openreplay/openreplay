\set previous_version 'v1.15.0'
\set next_version 'v1.16.0'
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

CREATE TABLE IF NOT EXISTS events.canvas_recordings
(
    session_id   bigint NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    recording_id text   NOT NULL,
    timestamp    bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS canvas_recordings_session_id_idx ON events.canvas_recordings (session_id);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif