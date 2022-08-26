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

COMMIT;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_unique_project_id_md5value_type_idx ON autocomplete (project_id, md5(value), type);

BEGIN;

DROP INDEX IF EXISTS autocomplete_unique;

COMMIT;