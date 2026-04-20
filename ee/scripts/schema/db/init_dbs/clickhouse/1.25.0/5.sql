DROP TABLE IF EXISTS experimental.autocomplete;

ALTER TABLE product_analytics.autocomplete_simple
    MODIFY COLUMN source Enum8('sessions'=0,'users'=1,'events'=2);
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 5;
