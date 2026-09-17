SELECT throwIf((SELECT openreplay_migration_state()) != 2, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS _is_deleted UInt8 DEFAULT 0 AFTER _deleted_at;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 3;
