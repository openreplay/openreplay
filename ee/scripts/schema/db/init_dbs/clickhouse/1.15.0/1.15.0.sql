CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.15.0-ee';

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS transfer_size Nullable(UInt32);

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS selector Nullable(String);

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS coordinate Tuple(x Nullable(UInt16), y Nullable(UInt16));

ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS timezone LowCardinality(Nullable(String));