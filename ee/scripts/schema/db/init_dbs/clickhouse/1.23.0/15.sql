SELECT throwIf((SELECT openreplay_migration_state()) != 14, 'Previous step is not done') AS check;

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> -1;