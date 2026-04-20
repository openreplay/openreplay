SELECT throwIf((SELECT openreplay_migration_state()) != 3, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.users_distinct_id
    MODIFY TTL _deleted_at WHERE _deleted_at != '1970-01-01 00:00:00';
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 4;
