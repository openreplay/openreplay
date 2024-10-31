\set previous_version 'v1.20.0-ee'
\set next_version 'v1.21.0-ee'
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

UPDATE public.roles
SET permissions='{SERVICE_SESSION_REPLAY,SERVICE_DEV_TOOLS,SERVICE_ASSIST_LIVE,SERVICE_ASSIST_CALL,SERVICE_READ_NOTES}'
WHERE service_role;

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

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
