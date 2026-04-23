SELECT throwIf((SELECT openreplay_migration_state()) != 6, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.events
    MODIFY COLUMN "$device_id" String AFTER "$user_id";
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 7;
