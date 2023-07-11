CREATE TABLE IF NOT EXISTS connector_user_sessions
(
-- SESSION METADATA
    sessionid                      bigint,
    user_agent                     VARCHAR(8000),
    user_browser                   VARCHAR(8000),
    user_browser_version           VARCHAR(8000),
    user_country                   VARCHAR(8000),
    user_device                    VARCHAR(8000),
    user_device_heap_size          bigint,
    user_device_memory_size        bigint,
    user_device_type               VARCHAR(8000),
    user_os                        VARCHAR(8000),
    user_os_version                VARCHAR(8000),
    user_uuid                      VARCHAR(8000),
    connection_effective_bandwidth bigint, -- Downlink
    connection_type                VARCHAR(8000),   --"bluetooth", "cellular", "ethernet", "none", "wifi", "wimax", "other", "unknown"
    metadata_key                   VARCHAR(8000),
    metadata_value                 VARCHAR(8000),
    referrer                       VARCHAR(8000),
    user_anonymous_id              VARCHAR(8000),
    user_id                        VARCHAR(8000),
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
    inputs_count                   bigint,
    clicks_count                   bigint,
    issues_count                   bigint,
    urls_count                     bigint
);
