CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.13.0-ee';


ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS user_city LowCardinality(String),
    ADD COLUMN IF NOT EXISTS user_state LowCardinality(String);

DROP TABLE IF EXISTS experimental.sessions_l7d_mv;

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.sessions_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT session_id,
       project_id,
       tracker_version,
       rev_id,
       user_uuid,
       user_os,
       user_os_version,
       user_browser,
       user_browser_version,
       user_device,
       user_device_type,
       user_country,
       user_city,
       user_state,
       platform,
       datetime,
       duration,
       pages_count,
       events_count,
       errors_count,
       utm_source,
       utm_medium,
       utm_campaign,
       user_id,
       user_anonymous_id,
       metadata_1,
       metadata_2,
       metadata_3,
       metadata_4,
       metadata_5,
       metadata_6,
       metadata_7,
       metadata_8,
       metadata_9,
       metadata_10,
       issue_types,
       referrer,
       base_referrer,
       issue_score,
       _timestamp
FROM experimental.sessions
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;