CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.17.0-ee';

ALTER TABLE experimental.events
    MODIFY COLUMN url_path MATERIALIZED lower(pathFull(url));

ALTER TABLE experimental.resources
    MODIFY COLUMN url_path MATERIALIZED lower(pathFull(url));

ALTER TABLE experimental.ios_events
    MODIFY COLUMN url_path MATERIALIZED lower(pathFull(url));