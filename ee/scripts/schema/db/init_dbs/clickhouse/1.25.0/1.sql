ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS "$current_path" String MATERIALIZED path("$current_url") AFTER "$current_url"
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 1;
