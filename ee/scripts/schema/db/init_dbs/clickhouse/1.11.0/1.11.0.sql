CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.11.0-ee';

ALTER TABLE experimental.events
    MODIFY COLUMN issue_type Nullable(Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20));

ALTER TABLE experimental.issues
    MODIFY COLUMN type Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20);

DROP TABLE IF EXISTS experimental.js_errors_sessions_mv;
DROP TABLE IF EXISTS experimental.events_l7d_mv;

ALTER TABLE experimental.events
    DROP COLUMN IF EXISTS container_id,
    DROP COLUMN IF EXISTS container_name,
    DROP COLUMN IF EXISTS container_src,
    DROP COLUMN IF EXISTS container_type;


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
       message_id,
       _timestamp
FROM experimental.events
WHERE datetime >= now() - INTERVAL 7 DAY;