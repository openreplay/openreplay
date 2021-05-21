CREATE TABLE IF NOT EXISTS connector_user_sessions_buffer
(
-- SESSION METADATA
    sessionid                      UInt64,
    user_agent                     Nullable(String),
    user_browser                   Nullable(String),
    user_browser_version           Nullable(String),
    user_country                   Nullable(String),
    user_device                    Nullable(String),
    user_device_heap_size          Nullable(UInt64),
    user_device_memory_size        Nullable(UInt64),
    user_device_type               Nullable(String),
    user_os                        Nullable(String),
    user_os_version                Nullable(String),
    user_uuid                      Nullable(String),
    connection_effective_bandwidth Nullable(UInt64), -- Downlink
    connection_type                Nullable(String),   --"bluetooth", "cellular", "ethernet", "none", "wifi", "wimax", "other", "unknown"
    metadata_key                   Nullable(String),
    metadata_value                 Nullable(String),
    referrer                       Nullable(String),
    user_anonymous_id              Nullable(String),
    user_id                        Nullable(String),
-- TIME
    session_start_timestamp        Nullable(UInt64),
    session_end_timestamp          Nullable(UInt64),
    session_duration               Nullable(UInt64),
-- SPEED INDEX RELATED
    first_contentful_paint         Nullable(UInt64),
    speed_index                    Nullable(UInt64),
    visually_complete              Nullable(UInt64),
    timing_time_to_interactive     Nullable(UInt64),
-- PERFORMANCE
    avg_cpu                        Nullable(UInt64),
    avg_fps                        Nullable(UInt64),
    max_cpu                        Nullable(UInt64),
    max_fps                        Nullable(UInt64),
    max_total_js_heap_size         Nullable(UInt64),
    max_used_js_heap_size          Nullable(UInt64),
-- ISSUES AND EVENTS
    js_exceptions_count            Nullable(UInt64),
    long_tasks_total_duration      Nullable(UInt64),
    long_tasks_max_duration        Nullable(UInt64),
    long_tasks_count               Nullable(UInt64),
    inputs_count                   Nullable(UInt64),
    clicks_count                   Nullable(UInt64),
    issues_count                   Nullable(UInt64),
    issues                         Array(Nullable(String)),
    urls_count                     Nullable(UInt64),
    urls                           Array(Nullable(String))
) ENGINE = Buffer(default, connector_user_sessions, 16, 10, 120, 10000, 1000000, 10000, 100000000);
