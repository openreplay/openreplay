CREATE TABLE IF NOT EXISTS connector_user_sessions
(
-- SESSION METADATA
    sessionid                      bigint,
    user_agent                     text,
    user_browser                   text,
    user_browser_version           text,
    user_country                   text,
    user_device                    text,
    user_device_heap_size          bigint,
    user_device_memory_size        bigint,
    user_device_type               text,
    user_os                        text,
    user_os_version                text,
    user_uuid                      text,
    connection_effective_bandwidth bigint, -- Downlink
    connection_type                text,   --"bluetooth", "cellular", "ethernet", "none", "wifi", "wimax", "other", "unknown"
    metadata_key                   text,
    metadata_value                 text,
    referrer                       text,
    user_anonymous_id              text,
    user_id                        text,
-- TIME
    session_start_timestamp        bigint,
    session_end_timestamp          bigint,
    session_duration               bigint,
-- SPEED INDEX RELATED
    first_contentful_paint         bigint,
    speed_index                    bigint,
    visually_complete              bigint,
    timing_time_to_interactive     bigint,
-- PERFORMANCE
    avg_cpu                        bigint,
    avg_fps                        bigint,
    max_cpu                        bigint,
    max_fps                        bigint,
    max_total_js_heap_size         bigint,
    max_used_js_heap_size          bigint,
-- ISSUES AND EVENTS
    js_exceptions_count            bigint,
    long_tasks_total_duration      bigint,
    long_tasks_max_duration        bigint,
    long_tasks_count               bigint,
    inputs_count                   bigint,
    clicks_count                   bigint,
    issues_count                   bigint,
    issues                         array,
    urls_count                     bigint,
    urls                           array
);