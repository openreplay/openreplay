CREATE TABLE IF NOT EXISTS experimental.autocomplete
(
    project_id UInt16,
    type LowCardinality(String),
    value      String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, type, value)
      TTL _timestamp + INTERVAL 1 MONTH;