ALTER TABLE product_analytics.events
    DROP COLUMN "_$user_id"
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 5;
