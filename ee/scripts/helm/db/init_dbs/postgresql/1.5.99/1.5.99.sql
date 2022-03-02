BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.X-ee'
$$ LANGUAGE sql IMMUTABLE;

UPDATE metrics
SET is_public= TRUE;


DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE nsp.nspname = current_schema()
                        AND typ.typname = 'metric_type') THEN
            CREATE TYPE metric_type AS ENUM ('timeseries','table');
        END IF;
    END;
$$
LANGUAGE plpgsql;

DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE nsp.nspname = current_schema()
                        AND typ.typname = 'metric_view_type') THEN
            CREATE TYPE metric_view_type AS ENUM ('lineChart','progress','table','pieChart');
        END IF;
    END;
$$
LANGUAGE plpgsql;

ALTER TABLE metrics
    ADD COLUMN IF NOT EXISTS
        metric_type metric_type      NOT NULL DEFAULT 'timeseries',
    ADD COLUMN IF NOT EXISTS
        view_type   metric_view_type NOT NULL DEFAULT 'lineChart',
    ADD COLUMN IF NOT EXISTS
        metric_of   text             NOT NULL DEFAULT 'sessionCount';

COMMIT;