CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.18.0-ee';

ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS screen_width Nullable(Int16),
    ADD COLUMN IF NOT EXISTS screen_height Nullable(Int16);