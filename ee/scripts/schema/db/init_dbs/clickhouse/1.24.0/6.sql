ALTER TABLE product_analytics.events
    ADD COLUMN "$user_id" String AFTER distinct_id
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 6;
