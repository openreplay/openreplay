SELECT throwIf((SELECT openreplay_migration_state()) != 5, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.events
    ADD COLUMN "$user_id" String AFTER distinct_id
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 6;
