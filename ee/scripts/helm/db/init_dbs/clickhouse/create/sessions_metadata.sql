CREATE TABLE sessions_metadata (
  session_id UInt64,
  user_id Nullable(String),
  user_anonymous_id Nullable(String),
  metadata_1 Nullable(String),
  metadata_2 Nullable(String),
  metadata_3 Nullable(String),
  metadata_4 Nullable(String),
  metadata_5 Nullable(String),
  metadata_6 Nullable(String),
  metadata_7 Nullable(String),
  metadata_8 Nullable(String),
  metadata_9 Nullable(String),
  metadata_10 Nullable(String),
  datetime DateTime
) ENGINE = MergeTree
PARTITION BY toDate(datetime)
ORDER BY (session_id)
TTL datetime + INTERVAL 1 MONTH;
