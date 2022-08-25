CREATE TABLE IF NOT EXISTS experimental.user_favorite_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now(),
    sign Int8
) ENGINE = CollapsingMergeTree(sign)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id)
      TTL _timestamp + INTERVAL 3 MONTH;