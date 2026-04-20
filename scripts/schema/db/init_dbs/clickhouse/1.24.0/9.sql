ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS sample_key UInt8
        MATERIALIZED cityHash64(event_id) % 100
    SETTINGS max_execution_time = 0;;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 9;
