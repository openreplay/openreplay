CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.18.0-ee';

ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS screen_width  Nullable(Int16),
    ADD COLUMN IF NOT EXISTS screen_height Nullable(Int16);

ALTER TABLE experimental.sessions
    MODIFY COLUMN IF EXISTS user_device_type Enum8('other'=0, 'desktop'=1, 'mobile'=2,'tablet'=3);

ALTER TABLE experimental.events
    MODIFY COLUMN url_path REMOVE MATERIALIZED;

ALTER TABLE experimental.resources
    MODIFY COLUMN url_path REMOVE MATERIALIZED;

ALTER TABLE experimental.ios_events
    MODIFY COLUMN url_path REMOVE MATERIALIZED;