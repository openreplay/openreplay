SELECT throwIf((SELECT openreplay_migration_state()) != 2, 'Previous step is not done') AS check;

CREATE TABLE IF NOT EXISTS experimental.user_favorite_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now(),
    sign       Int8
) ENGINE = CollapsingMergeTree(sign)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id);

CREATE TABLE IF NOT EXISTS experimental.user_viewed_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id);
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 3;
