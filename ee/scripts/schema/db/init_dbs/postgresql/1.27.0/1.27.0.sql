\set previous_version 'v1.26.0-ee'
\set next_version 'v1.27.0-ee'
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

ALTER TABLE IF EXISTS public.tags
    ADD COLUMN IF NOT EXISTS location text NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.mcp_authentication_tokens
(
    user_id   integer                     NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    client_id text                        NOT NULL,
    state     text                        NOT NULL,
    jti       text                        NOT NULL DEFAULT generate_api_key(10),
    iat       timestamp without time zone NULL     DEFAULT NULL,
    generated bool                                 DEFAULT FALSE,
    PRIMARY KEY (user_id, client_id, state)
);

CREATE TABLE IF NOT EXISTS public.mcp_app_users
(
    user_id    integer                     NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    client_id  text                        NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    PRIMARY KEY (user_id, client_id)
);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
