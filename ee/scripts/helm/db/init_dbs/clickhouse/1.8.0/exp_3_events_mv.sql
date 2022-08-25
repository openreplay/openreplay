CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.events_l7d_mv
            ENGINE = MergeTree
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
            POPULATE
AS
SELECT *
FROM experimental.events
WHERE datetime >= now() - INTERVAL 7 DAY;