\set previous_version 'v1.23.0'
\set next_version 'v1.22.0'
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

CREATE SCHEMA IF NOT EXISTS or_cache;

CREATE TABLE IF NOT EXISTS or_cache.autocomplete_top_values
(
    project_id     integer                                        NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    event_type     text                                           NOT NULL,
    event_key      text                                           NULL,
    result         jsonb                                          NULL,
    execution_time integer                                        NULL,
    created_at     timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE NULLS NOT DISTINCT (project_id, event_type, event_key)
);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB downgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif