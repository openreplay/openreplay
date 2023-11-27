CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.14.0-ee';

ALTER TABLE experimental.events
    DROP COLUMN IF EXISTS transfer_size;

ALTER TABLE experimental.events
    DROP COLUMN IF EXISTS selector;

ALTER TABLE experimental.events
    DROP COLUMN IF EXISTS coordinate;

ALTER TABLE experimental.sessions
    DROP COLUMN IF EXISTS timezone;

DROP TABLE IF EXISTS experimental.ios_events;