BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.3'
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
        metric_type   metric_type      NOT NULL DEFAULT 'timeseries',
    ADD COLUMN IF NOT EXISTS
        view_type     metric_view_type NOT NULL DEFAULT 'lineChart',
    ADD COLUMN IF NOT EXISTS
        metric_of     text             NOT NULL DEFAULT 'sessionCount',
    ADD COLUMN IF NOT EXISTS
        metric_value  text[]           NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS
        metric_format text;

DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE typ.typname = 'http_method') THEN
            CREATE TYPE http_method AS ENUM ('GET','HEAD','POST','PUT','DELETE','CONNECT','OPTIONS','TRACE','PATCH');
        END IF;
    END;
$$
LANGUAGE plpgsql;


ALTER TABLE events.graphql
    ADD COLUMN IF NOT EXISTS request_body  text        NULL,
    ADD COLUMN IF NOT EXISTS response_body text        NULL,
    ADD COLUMN IF NOT EXISTS status_code   smallint    NULL,
    ADD COLUMN IF NOT EXISTS method        http_method NULL,
    ADD COLUMN IF NOT EXISTS duration      integer     NULL;

ALTER TABLE events_common.requests
    ADD COLUMN IF NOT EXISTS request_body  text        NULL,
    ADD COLUMN IF NOT EXISTS response_body text        NULL,
    ADD COLUMN IF NOT EXISTS status_code   smallint    NULL,
    ADD COLUMN IF NOT EXISTS method        http_method NULL;

UPDATE tenants
SET version_number= openreplay_version();

COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_request_body_nn_idx ON events_common.requests (request_body) WHERE request_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_request_body_nn_gin_idx ON events_common.requests USING GIN (request_body gin_trgm_ops) WHERE request_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_response_body_nn_idx ON events_common.requests (response_body) WHERE response_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_response_body_nn_gin_idx ON events_common.requests USING GIN (response_body gin_trgm_ops) WHERE response_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_status_code_nn_idx ON events_common.requests (status_code) WHERE status_code IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_request_body_nn_idx ON events.graphql (request_body) WHERE request_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_request_body_nn_gin_idx ON events.graphql USING GIN (request_body gin_trgm_ops) WHERE request_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_response_body_nn_idx ON events.graphql (response_body) WHERE response_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_response_body_nn_gin_idx ON events.graphql USING GIN (response_body gin_trgm_ops) WHERE response_body IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_status_code_nn_idx ON events.graphql (status_code) WHERE status_code IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS graphql_duration_nn_gt0_idx ON events.graphql (duration) WHERE duration IS NOT NULL AND duration > 0;
