-- !!!!NOT IN CREATE DB YET

BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.X'
$$ LANGUAGE sql IMMUTABLE;

CREATE TYPE http_method AS ENUM ('GET','HEAD','POST','PUT','DELETE','CONNECT','OPTIONS','TRACE','PATCH');

ALTER TABLE events_common.requests
    ADD COLUMN IF NOT EXISTS schema        text        NULL,
    ADD COLUMN IF NOT EXISTS host          text        NULL,
    ADD COLUMN IF NOT EXISTS base_path     text        NULL,
    ADD COLUMN IF NOT EXISTS query_string  text        NULL,
    ADD COLUMN IF NOT EXISTS request_body  text        NULL,
    ADD COLUMN IF NOT EXISTS response_body text        NULL,
    ADD COLUMN IF NOT EXISTS status_code   smallint    NULL,
    ADD COLUMN IF NOT EXISTS method        http_method NULL;

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


ALTER TABLE events.graphql
    ADD COLUMN IF NOT EXISTS request_body  text        NULL,
    ADD COLUMN IF NOT EXISTS response_body text        NULL,
    ADD COLUMN IF NOT EXISTS status_code   smallint    NULL,
    ADD COLUMN IF NOT EXISTS method        http_method NULL,
    ADD COLUMN IF NOT EXISTS duration      integer     NULL;

COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_host_nn_idx ON events_common.requests (host) WHERE host IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_host_nn_gin_idx ON events_common.requests USING GIN (host gin_trgm_ops) WHERE host IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_base_path_nn_idx ON events_common.requests (base_path) WHERE base_path IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_base_path_nn_gin_idx ON events_common.requests USING GIN (base_path gin_trgm_ops) WHERE base_path IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_query_string_nn_idx ON events_common.requests (query_string) WHERE query_string IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS requests_query_string_nn_gin_idx ON events_common.requests USING GIN (query_string gin_trgm_ops) WHERE query_string IS NOT NULL;
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