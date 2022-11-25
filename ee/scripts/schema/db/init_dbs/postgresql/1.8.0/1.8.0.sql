BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.8.0-ee'
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE IF EXISTS projects
    ADD COLUMN IF NOT EXISTS first_recorded_session_at timestamp without time zone NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sessions_last_check_at    timestamp without time zone NULL DEFAULT NULL;


DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE nsp.nspname = current_schema()
                        AND typ.typname = 'alert_change_type') THEN
            CREATE TYPE alert_change_type AS ENUM ('percent', 'change');
        END IF;
    END;
$$
LANGUAGE plpgsql;

ALTER TABLE IF EXISTS alerts
    ADD COLUMN IF NOT EXISTS change alert_change_type NOT NULL DEFAULT 'change';

ALTER TABLE IF EXISTS sessions
    ADD COLUMN IF NOT EXISTS referrer      text NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS base_referrer text NULL DEFAULT NULL;
CREATE INDEX IF NOT EXISTS sessions_base_referrer_gin_idx ON public.sessions USING GIN (base_referrer gin_trgm_ops);

ALTER TABLE IF EXISTS events.performance
    ADD COLUMN IF NOT EXISTS host  text NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS path  text NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS query text NULL DEFAULT NULL;

COMMIT;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_unique_project_id_md5value_type_idx ON autocomplete (project_id, md5(value), type);

BEGIN;

DROP INDEX IF EXISTS autocomplete_unique;
DROP INDEX IF EXISTS events_common.requests_response_body_nn_idx;
DROP INDEX IF EXISTS events_common.requests_request_body_nn_idx;

COMMIT;