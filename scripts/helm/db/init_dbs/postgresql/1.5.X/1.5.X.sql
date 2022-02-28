-- !!!!NOT IN CREATE DB YET

BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.X'
$$ LANGUAGE sql IMMUTABLE;


-- Split requests-URL:
UPDATE events_common.requests
SET schema=CASE WHEN POSITION('://' IN url) > 0 THEN SUBSTRING(url, 1, POSITION('://' IN url) - 1) END,
    host=CASE
             WHEN POSITION('://' IN url) = 0 THEN NULL
             WHEN POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN SUBSTRING(
                     SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1), 1,
                     POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) - 1)
             ELSE SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1) END,
    base_path=CASE
                  WHEN POSITION('://' IN url) = 0 THEN
                      CASE
                          WHEN POSITION('?' IN url) > 0 THEN
                              SUBSTRING(url, 1, POSITION('?' IN url) - 1)
                          ELSE url END
                  WHEN POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN
                      CASE
                          WHEN POSITION('?' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) > 0 THEN
                              SUBSTRING(SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1),
                                        POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) + 1,
                                        POSITION('?' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) -
                                        POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) - 1)
                          ELSE SUBSTRING(SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1),
                                         POSITION('/' IN SUBSTRING(SUBSTRING(url, POSITION('://' IN url) + 3), 1)) +
                                         1) END
        END,
    query_string=CASE
                     WHEN POSITION('?' IN url) > 0 THEN SUBSTRING(url, POSITION('?' IN url) + 1)
        END;



COMMIT;