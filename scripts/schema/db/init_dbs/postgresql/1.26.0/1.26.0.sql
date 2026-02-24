\set previous_version 'v1.25.0'
\set next_version 'v1.26.0'
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

ALTER TABLE public.dashboard_widgets
ALTER COLUMN user_id DROP NOT NULL ;

UPDATE public.metrics
SET metric_format = 'sessionCount'
WHERE metric_format IS NULL;

ALTER TABLE public.metrics
    ALTER COLUMN metric_format SET DEFAULT 'sessionCount',
    ALTER COLUMN metric_format SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.actions
(
    action_id   uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  integer                     NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    user_id     integer                     NULL REFERENCES public.users (user_id) ON DELETE SET NULL,
    name        varchar(255)                NOT NULL,
    description varchar(1024)               NULL     DEFAULT NULL,
    filters     jsonb                       NOT NULL DEFAULT '[]'::jsonb,
    is_public   boolean                     NOT NULL DEFAULT FALSE,
    created_at  timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at  timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS actions_user_id_idx ON public.actions (user_id);
CREATE INDEX IF NOT EXISTS actions_project_id_user_id_idx ON public.actions (project_id, user_id);
CREATE INDEX IF NOT EXISTS actions_project_id_is_public_idx ON public.actions (project_id, is_public);
CREATE INDEX IF NOT EXISTS actions_name_gin_idx ON public.actions USING GIN (name gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS actions_project_id_name_idx ON public.actions (project_id, name);
CREATE INDEX IF NOT EXISTS actions_project_id_created_at_idx ON public.actions (project_id, created_at DESC);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
