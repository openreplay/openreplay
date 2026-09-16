SELECT throwIf((SELECT openreplay_migration_state()) != 0, 'Previous step is not done') AS check;

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 1;
