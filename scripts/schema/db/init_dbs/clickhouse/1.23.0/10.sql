SELECT throwIf((SELECT openreplay_migration_state()) != 9, 'Previous step is not done') AS check;

ALTER TABLE experimental.sessions
    DROP COLUMN IF EXISTS issue_score
    SETTINGS max_execution_time = 0;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 10;
