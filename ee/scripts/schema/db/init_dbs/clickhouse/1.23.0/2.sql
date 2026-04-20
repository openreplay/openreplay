SELECT throwIf((SELECT openreplay_migration_state()) != 1, 'Previous step is not done') AS check;

ALTER TABLE experimental.sessions
    MODIFY COLUMN platform Enum8('web'=1,'mobile'=2) DEFAULT 'web';

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 2;
