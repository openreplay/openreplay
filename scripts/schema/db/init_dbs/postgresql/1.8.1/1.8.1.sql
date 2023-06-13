\set previous_version 'v1.8.0'
\set next_version 'v1.8.1'
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

INSERT INTO metrics (name, category, default_config, is_predefined, is_template, is_public, predefined_key, metric_type,
                     view_type)
VALUES ('Fetch Calls with Errors', 'errors', '{
  "col": 4,
  "row": 2,
  "position": 0
}', true, true, true, 'calls_errors', 'predefined', 'table')
ON CONFLICT (predefined_key) DO UPDATE
    SET name=excluded.name,
        category=excluded.category,
        default_config=excluded.default_config,
        is_predefined=excluded.is_predefined,
        is_template=excluded.is_template,
        is_public=excluded.is_public,
        metric_type=excluded.metric_type,
        view_type=excluded.view_type;

ALTER TABLE IF EXISTS oauth_authentication
    DROP CONSTRAINT IF EXISTS oauth_authentication_user_id_provider_provider_user_id_key;

DROP INDEX IF EXISTS oauth_authentication_user_id_provider_provider_user_id_key;

ALTER TABLE IF EXISTS oauth_authentication
    DROP CONSTRAINT IF EXISTS oauth_authentication_user_id_provider_key;

DROP INDEX IF EXISTS oauth_authentication_user_id_provider_key;

CREATE UNIQUE INDEX IF NOT EXISTS oauth_authentication_unique_user_id_provider_idx ON oauth_authentication (user_id, provider);

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif