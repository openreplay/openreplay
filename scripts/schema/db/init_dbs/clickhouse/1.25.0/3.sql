SELECT throwIf((SELECT openreplay_migration_state()) != 2, 'Previous step is not done') AS check;
ALTER TABLE product_analytics.autocomplete_events_grouped
    MODIFY COLUMN _timestamp DateTime DEFAULT now();
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 3;
