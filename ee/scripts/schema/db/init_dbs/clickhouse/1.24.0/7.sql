ALTER TABLE product_analytics.events
    MODIFY COLUMN "$device_id" String AFTER "$user_id";
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 7;
