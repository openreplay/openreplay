CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.18.0-ee';

DROP TABLE IF EXISTS experimental.events_l7d_mv;

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS coordinate Tuple(x Nullable(UInt16), y Nullable(UInt16));

ALTER TABLE experimental.ios_events
    ADD COLUMN IF NOT EXISTS coordinate Tuple(x Nullable(UInt16), y Nullable(UInt16));

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
       coordinate,
       message_id,
       _timestamp
FROM experimental.events
WHERE datetime >= now() - INTERVAL 7 DAY;