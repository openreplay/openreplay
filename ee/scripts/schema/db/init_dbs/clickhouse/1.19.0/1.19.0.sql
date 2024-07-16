CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.19.0-ee';

DROP TABLE IF EXISTS experimental.events_l7d_mv;

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS normalized_x Nullable(Float32),
    ADD COLUMN IF NOT EXISTS normalized_y Nullable(Float32),
    DROP COLUMN IF EXISTS coordinate;

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.events_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, event_type, session_id, message_id)
                TTL datetime + INTERVAL 7 DAY
            POPULATE
AS
SELECT session_id,
       project_id,
       event_type,
       datetime,
       label,
       hesitation_time,
       name,
       payload,
       level,
       source,
       message,
       error_id,
       duration,
       context,
       url,
       url_host,
       url_path,
       url_hostpath,
       request_start,
       response_start,
       response_end,
       dom_content_loaded_event_start,
       dom_content_loaded_event_end,
       load_event_start,
       load_event_end,
       first_paint,
       first_contentful_paint_time,
       speed_index,
       visually_complete,
       time_to_interactive,
       ttfb,
       ttlb,
       response_time,
       dom_building_time,
       dom_content_loaded_event_time,
       load_event_time,
       min_fps,
       avg_fps,
       max_fps,
       min_cpu,
       avg_cpu,
       max_cpu,
       min_total_js_heap_size,
       avg_total_js_heap_size,
       max_total_js_heap_size,
       min_used_js_heap_size,
       avg_used_js_heap_size,
       max_used_js_heap_size,
       method,
       status,
       success,
       request_body,
       response_body,
       issue_type,
       issue_id,
       error_tags_keys,
       error_tags_values,
       transfer_size,
       selector,
       normalized_x,
       normalized_y,
       message_id,
       _timestamp
FROM experimental.events
WHERE datetime >= now() - INTERVAL 7 DAY;

ALTER TABLE experimental.ios_events
    DROP COLUMN IF EXISTS coordinate;

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
       timezone,
       duration,
       pages_count,
       events_count,
       errors_count,
       utm_source,
       utm_medium,
       utm_campaign,
       user_id,
       user_anonymous_id,
       issue_types,
       referrer,
       base_referrer,
       issue_score,
       screen_width,
       screen_height,
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
       _timestamp
FROM experimental.sessions
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;