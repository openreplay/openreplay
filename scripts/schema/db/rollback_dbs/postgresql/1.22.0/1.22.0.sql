\set previous_version 'v1.22.0'
\set next_version 'v1.21.0'
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

CREATE TABLE public.user_favorite_errors
(
    user_id  integer NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    error_id text    NOT NULL REFERENCES public.errors (error_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, error_id)
);

CREATE TABLE public.user_viewed_errors
(
    user_id  integer NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    error_id text    NOT NULL REFERENCES public.errors (error_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, error_id)
);
CREATE INDEX user_viewed_errors_user_id_idx ON public.user_viewed_errors (user_id);
CREATE INDEX user_viewed_errors_error_id_idx ON public.user_viewed_errors (error_id);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB downgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif