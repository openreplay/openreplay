\set previous_version 'v1.15.0'
\set next_version 'v1.14.0'
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
ALTER TABLE IF EXISTS events_common.requests
    DROP COLUMN IF EXISTS transfer_size;

ALTER TABLE IF EXISTS public.sessions
    DROP COLUMN IF EXISTS timezone;

ALTER TABLE IF EXISTS public.projects
    DROP COLUMN IF EXISTS platform;

DROP TABLE IF EXISTS events_common.crashes;

DROP TABLE IF EXISTS public.crashes_ios;

DROP SCHEMA IF EXISTS events_ios CASCADE;

ALTER TABLE IF EXISTS public.users
    DROP COLUMN IF EXISTS jwt_refresh_jti,
    DROP COLUMN IF EXISTS jwt_refresh_iat;

ALTER TABLE IF EXISTS events.clicks
    DROP COLUMN IF EXISTS x,
    DROP COLUMN IF EXISTS y;


ALTER TABLE IF EXISTS public.metrics
    DROP COLUMN IF EXISTS card_info;

ALTER TABLE IF EXISTS public.users
    DROP COLUMN IF EXISTS settings;

COMMIT;

\elif :is_next
\echo old version detected :'next_version', nothing to do
\else
\warn skipping DB downgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif