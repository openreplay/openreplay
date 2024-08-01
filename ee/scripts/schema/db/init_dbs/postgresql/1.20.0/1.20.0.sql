\set previous_version 'v1.19.0-ee'
\set next_version 'v1.20.0-ee'
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
ALTER TABLE IF EXISTS events.clicks
    ALTER COLUMN normalized_x SET DATA TYPE decimal,
    ALTER COLUMN normalized_y SET DATA TYPE decimal;

UPDATE public.roles
SET permissions = (SELECT array_agg(distinct e) FROM unnest(permissions || '{SPOT}') AS e)
WHERE NOT permissions @> '{SPOT}'
  AND NOT service_role;

UPDATE public.roles
SET permissions = (SELECT array_agg(distinct e) FROM unnest(permissions || '{SPOT_PUBLIC}') AS e)
WHERE NOT permissions @> '{SPOT_PUBLIC}'
  AND name ILIKE 'owner';

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS spot_jwt_iat         timestamp without time zone NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS spot_jwt_refresh_jti integer                     NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS spot_jwt_refresh_iat timestamp without time zone NULL DEFAULT NULL;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
