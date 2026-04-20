SELECT throwIf((SELECT openreplay_version()) != 'v1.24.0', 'Previous version does not match v1.24.0') AS check;
CREATE FUNCTION IF NOT EXISTS openreplay_migration_state AS() ->
    -1;
SELECT throwIf((SELECT openreplay_migration_state()) > -1,
               'Previous migration did not finish[' || (SELECT openreplay_version()) || ' step:' ||
               (SELECT openreplay_migration_state()) || ']') AS check;

CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.25.0';
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 0;