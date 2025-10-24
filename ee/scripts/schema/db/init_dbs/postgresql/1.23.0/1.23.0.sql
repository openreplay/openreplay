\set previous_version 'v1.22.0-ee'
\set next_version 'v1.23.0-ee'
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

DROP SCHEMA IF EXISTS or_cache CASCADE;
ALTER TABLE public.tenants
    ALTER COLUMN scope_state SET DEFAULT 2;

ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'incident';

CREATE TABLE IF NOT EXISTS public.saved_searches
(
    search_id    uuid                           PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   integer                        NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    user_id      integer                        NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    name         varchar(255)                   DEFAULT NULL,
    is_public    boolean                        NOT NULL DEFAULT FALSE,
    is_share     boolean                        NOT NULL DEFAULT FALSE,
    search_data  jsonb                          NOT NULL,
    created_at   timestamp without time zone    NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at   timestamp without time zone    NULL     DEFAULT NULL,
    deleted_at   timestamp without time zone    NULL     DEFAULT NULL
);

CREATE INDEX saved_searches_project_id_idx ON public.saved_searches (project_id);

CREATE TABLE public.sessions_videos
(
    session_id      bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    project_id      integer NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    user_id         integer NOT NULL,
    status          varchar(50) NOT NULL,
    job_id          varchar(255),
    file_url        varchar(1024),
    error_message   text,
    created_at      timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    modified_at     timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY(session_id)
);

CREATE UNIQUE INDEX sessions_videos_session_id_project_id_key ON public.sessions_videos USING btree (session_id, project_id);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
