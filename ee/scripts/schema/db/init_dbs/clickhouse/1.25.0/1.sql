SELECT throwIf((SELECT openreplay_migration_state()) != 0, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS experimental.sessions_l7d_mv;
ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS "$current_path" String MATERIALIZED path("$current_url") AFTER "$current_url"
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 1;
