CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.15.0-ee';

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS transfer_size Nullable(UInt32);