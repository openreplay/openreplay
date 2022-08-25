CREATE TABLE IF NOT EXISTS experimental.user_viewed_errors
(
    project_id UInt16,
    user_id    UInt32,
    error_id   String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, error_id)
      TTL _timestamp + INTERVAL 3 MONTH;