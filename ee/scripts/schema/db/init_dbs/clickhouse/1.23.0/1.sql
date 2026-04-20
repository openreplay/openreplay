SELECT throwIf((SELECT openreplay_migration_state()) != 0, 'Previous step is not done') AS check;

SELECT throwIf(platform = 'ios', 'IOS sessions found')
FROM experimental.sessions
WHERE platform = 'ios';

SELECT throwIf(platform = 'android', 'Android sessions found')
FROM experimental.sessions
WHERE platform = 'android';

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 1;
