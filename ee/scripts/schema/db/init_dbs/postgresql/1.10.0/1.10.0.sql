BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.10.0-ee'
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS frontend_signals
(
    project_id    bigint                                         NOT NULL,
    user_id       text                                           NOT NULL,
    timestamp     bigint                                         NOT NULL,
    action        text                                           NOT NULL,
    source        text                                           NOT NULL,
    category      text                                           NOT NULL,
    data          json
);
CREATE INDEX IF NOT EXISTS frontend_signals_user_id_idx ON frontend_signals (user_id);

COMMIT;
