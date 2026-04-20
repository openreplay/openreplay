ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS is_vault BOOL DEFAULT FALSE AFTER metadata_10
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> -1;
