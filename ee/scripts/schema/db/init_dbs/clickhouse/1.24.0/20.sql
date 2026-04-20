SELECT throwIf((SELECT openreplay_migration_state()) != 19, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.events
    MODIFY TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00' AND NOT is_vault;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 20;
