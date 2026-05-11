SELECT throwIf((SELECT openreplay_version()) != 'v1.26.0-ee', 'Previous version does not match v1.26.0-ee') AS check;
CREATE FUNCTION IF NOT EXISTS openreplay_migration_state AS() ->
    -1;
SELECT throwIf((SELECT openreplay_migration_state()) > -1,
               'Previous migration did not finish[' || (SELECT openreplay_version()) || ' step:' ||
               (SELECT openreplay_migration_state()) || ']') AS check;

CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.27.0-ee';
DROP TABLE IF EXISTS experimental.sessions_l7d_mv;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> -1;