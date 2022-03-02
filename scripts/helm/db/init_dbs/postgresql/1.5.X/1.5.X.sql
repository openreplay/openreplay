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
    ADD COLUMN IF NOT EXISTS status_code   text        NULL,
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
    ADD COLUMN IF NOT EXISTS status_code   text        NULL,
    ADD COLUMN IF NOT EXISTS method        http_method NULL,
    ADD COLUMN IF NOT EXISTS duration      integer     NULL;

COMMIT;