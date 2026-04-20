ALTER TABLE product_analytics.events
    RENAME COLUMN "$user_id" TO "_$user_id"
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 4;
