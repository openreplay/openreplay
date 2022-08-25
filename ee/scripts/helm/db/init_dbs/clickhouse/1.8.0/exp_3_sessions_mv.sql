CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.sessions_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT *
FROM experimental.sessions
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;