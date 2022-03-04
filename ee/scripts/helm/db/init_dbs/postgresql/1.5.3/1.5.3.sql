BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.3-ee'
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

ALTER TABLE events_common.requests
    ADD COLUMN IF NOT EXISTS schema       text NULL,
    ADD COLUMN IF NOT EXISTS host         text NULL,
    ADD COLUMN IF NOT EXISTS base_path    text NULL,
    ADD COLUMN IF NOT EXISTS query_string text NULL;

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

CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_host_nn_idx ON events_common.requests (host) WHERE host IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_host_nn_gin_idx ON events_common.requests USING GIN (host gin_trgm_ops) WHERE host IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_base_path_nn_idx ON events_common.requests (base_path) WHERE base_path IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_base_path_nn_gin_idx ON events_common.requests USING GIN (base_path gin_trgm_ops) WHERE base_path IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_query_string_nn_idx ON events_common.requests (query_string) WHERE query_string IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_query_string_nn_gin_idx ON events_common.requests USING GIN (query_string gin_trgm_ops) WHERE query_string IS NOT NULL;



-- Split requests-URL: Takes too long to use
-- UPDATE events_common.requests
-- SET schema=CASE WHEN POSITION('://' IN url) > 0 THEN SUBSTRING(url, 1, POSITION('://' IN url) - 1) END,
--     host=CASE
--              WHEN POSITION('://' IN url) = 0 THEN NULL
--              WHEN POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN SUBSTRING(
--                      SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1), 1,
--                      POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) - 1)
--              ELSE SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1) END,
--     base_path=CASE
--                   WHEN POSITION('://' IN url) = 0 THEN
--                       CASE
--                           WHEN POSITION('?' IN url) > 0 THEN
--                               SUBSTRING(url, 1, POSITION('?' IN url) - 1)
--                           ELSE url END
--                   WHEN POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN
--                       CASE
--                           WHEN POSITION('?' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN
--                               SUBSTRING(SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1),
--                                         POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) + 1,
--                                         POSITION('?' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) -
--                                         POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) - 1)
--                           ELSE SUBSTRING(SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1),
--                                          POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) +
--                                          1) END
--         END,
--     query_string=CASE
--                      WHEN POSITION('?' IN url) > 0 THEN SUBSTRING(url, POSITION('?' IN url) + 1)
--         END;

