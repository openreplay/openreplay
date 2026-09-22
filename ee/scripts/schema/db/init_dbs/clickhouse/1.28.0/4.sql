SELECT throwIf((SELECT openreplay_migration_state()) != 3, 'Previous step is not done') AS check;
ALTER TABLE experimental.sessions
    ADD INDEX IF NOT EXISTS user_id_idx (user_id) TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.events
    ADD INDEX IF NOT EXISTS user_id_idx ("$user_id") TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.events
    ADD INDEX IF NOT EXISTS devise_id_idx ("$device_id") TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.users_distinct_id
    ADD INDEX IF NOT EXISTS user_id_idx ("$user_id") TYPE bloom_filter(0.01) GRANULARITY 4;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> (-1);
