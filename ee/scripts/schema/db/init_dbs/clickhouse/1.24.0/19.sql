ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS is_vault BOOL DEFAULT FALSE AFTER error_id
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 19;
