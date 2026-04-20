SELECT throwIf((SELECT openreplay_migration_state()) != 2, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.all_events
    DROP COLUMN IF EXISTS display_name,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS _edited_by_user
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 3;
