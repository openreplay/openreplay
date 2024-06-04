CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.19.0-ee';


ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS normalized_x Nullable(UInt8),
    ADD COLUMN IF NOT EXISTS normalized_y Nullable(UInt8);
