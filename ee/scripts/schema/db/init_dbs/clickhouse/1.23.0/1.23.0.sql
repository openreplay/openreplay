SELECT 1
FROM (SELECT throwIf(platform = 'ios', 'IOS sessions found')
      FROM experimental.sessions) AS raw
LIMIT 1;

SELECT 1
FROM (SELECT throwIf(platform = 'android', 'Android sessions found')
      FROM experimental.sessions) AS raw
LIMIT 1;

ALTER TABLE experimental.sessions
    MODIFY COLUMN platform Enum8('web'=1,'mobile'=2) DEFAULT 'web';

CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0-ee';


CREATE TABLE IF NOT EXISTS experimental.user_favorite_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now(),
    sign       Int8
) ENGINE = CollapsingMergeTree(sign)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id);

CREATE TABLE IF NOT EXISTS experimental.user_viewed_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id);

DROP TABLE IF EXISTS product_analytics.all_events;
CREATE TABLE IF NOT EXISTS product_analytics.all_events
(
    project_id          UInt16,
    auto_captured       BOOL     DEFAULT FALSE,
    event_name          String,
    display_name        String   DEFAULT '',
    description         String   DEFAULT '',
    event_count_l30days UInt32   DEFAULT 0,
    query_count_l30days UInt32   DEFAULT 0,

    created_at          DateTime64,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, auto_captured, event_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT DISTINCT ON (project_id,auto_captured,event_name) project_id,
                                                         `$auto_captured` AS auto_captured,
                                                         `$event_name`    AS event_name,
                                                         multiIf(isNotNull(old_data.display_name) AND
                                                                 notEmpty(old_data.display_name), old_data.display_name,
                                                                 not `$auto_captured`, '',
                                                                 `$event_name` == 'CLICK', 'Click',
                                                                 `$event_name` == 'INPUT', 'Text Input',
                                                                 `$event_name` == 'LOCATION', 'Visited URL',
                                                                 `$event_name` == 'ERROR', 'Error',
                                                                 `$event_name` == 'REQUEST', 'Network Request',
                                                                 `$event_name` == 'PERFORMANCE', 'Performance',
                                                                 `$event_name` == 'ISSUE', 'Issue',
                                                                 `$event_name` == 'INCIDENT', 'Incident',
                                                                 '')      AS display_name,
                                                         multiIf(isNotNull(old_data.description) AND
                                                                 notEmpty(old_data.description), old_data.description,
                                                                 not `$auto_captured`, '',
                                                                 `$event_name` == 'CLICK',
                                                                 'Represents a user click on a webpage element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CLICK".\n\nContains element selector, text content, …, timestamp.',
                                                                 `$event_name` == 'INPUT',
                                                                 'Represents text input by a user in form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".\n\nContains the element selector, ….. and timestamp (actual text content may be masked for privacy).',
                                                                 `$event_name` == 'LOCATION',
                                                                 'Represents a page navigation or URL change within your application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "LOCATION".\n\nContains the full URL, …. referrer information, UTM parameters and timestamp.',
                                                                 `$event_name` == 'ERROR',
                                                                 'Represents JavaScript errors and console error messages captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "error".\n\nContains error message,…., and timestamp.',
                                                                 `$event_name` == 'REQUEST',
                                                                 'Represents HTTP/HTTPS network activity from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "fetch".\n\nContains URL, method, status code, duration, and timestamp',
                                                                 '')      AS description
FROM product_analytics.events
         LEFT JOIN (SELECT project_id,
                           auto_captured,
                           event_name,
                           display_name,
                           description
                    FROM product_analytics.all_events
                    WHERE all_events.display_name != ''
                       OR all_events.description != '') AS old_data
                   ON (events.project_id = old_data.project_id AND events.`$auto_captured` = old_data.auto_captured AND
                       events.`$event_name` = old_data.event_name);

CREATE TABLE IF NOT EXISTS product_analytics.event_properties
(
    project_id    UInt16,
    event_name    String,
    property_name String,
    value_type    String,
    auto_captured BOOL,

    _timestamp    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name, value_type, auto_captured);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_properties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`                                                              AS event_name,
       property_name,
       toString(JSONType(JSONExtractRaw(toString(`$properties`), property_name))) AS value_type,
       `$auto_captured`                                                           AS auto_captured
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
-- @formatter:off
UNION DISTINCT
-- @formatter:on
SELECT project_id,
       `$event_name`                                                             AS event_name,
       property_name,
       toString(JSONType(JSONExtractRaw(toString(`properties`), property_name))) AS value_type,
       `$auto_captured`                                                          AS auto_captured
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name;

DROP TABLE IF EXISTS product_analytics.all_properties;
CREATE TABLE IF NOT EXISTS product_analytics.all_properties
(
    project_id        UInt16,
    property_name     String,
    is_event_property BOOL,
    display_name      String   DEFAULT '',
    description       String   DEFAULT '',
    status            String   DEFAULT 'visible' COMMENT 'visible/hidden/dropped',
    data_count        UInt32   DEFAULT 1,
    query_count       UInt32   DEFAULT 0,

    created_at        DateTime64,
    _timestamp        DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, property_name, is_event_property);


CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_properties_extractor_mv
    TO product_analytics.all_properties AS
-- auto-captured, from '$properties' (has predefined display-name)
SELECT project_id,
       property_name,
       TRUE                               AS is_event_property,
       multiIf(isNotNull(old_data.display_name) AND notEmpty(old_data.display_name), old_data.display_name,
               property_name == 'label', 'Label',
               property_name == 'hesitation_time', 'Hesitation Time',
               property_name == 'name', 'Name',
               property_name == 'payload', 'Payload',
               property_name == 'level', 'Level',
               property_name == 'source', 'Source',
               property_name == 'message', 'Message',
               property_name == 'error_id', 'Error ID',
               property_name == 'duration', 'Duration',
               property_name == 'context', 'Context',
               property_name == 'url_host', 'URL Host',
               property_name == 'url_path', 'URL Path',
               property_name == 'url_hostpath', 'URL Host and Path',
               property_name == 'request_start', 'Request Start',
               property_name == 'response_start', 'Response Start',
               property_name == 'response_end', 'Response End',
               property_name == 'dom_content_loaded_event_start', 'DOM Content Loaded Event Start',
               property_name == 'dom_content_loaded_event_end', 'DOM Content Loaded Event End',
               property_name == 'load_event_start', 'Load Event Start',
               property_name == 'load_event_end', 'Load Event End',
               property_name == 'first_paint', 'First Paint',
               property_name == 'first_contentful_paint_time', 'First Contentful-paint Time',
               property_name == 'speed_index', 'Speed Index',
               property_name == 'visually_complete', 'Visually Complete',
               property_name == 'time_to_interactive', 'Time To Interactive',
               property_name == 'ttfb', 'Time To First Byte',
               property_name == 'ttlb', 'Time To Last Byte',
               property_name == 'response_time', 'Response Time',
               property_name == 'dom_building_time', 'DOM Building Time',
               property_name == 'dom_content_loaded_event_time', 'DOM Content Loaded Event Time',
               property_name == 'load_event_time', 'Load Event Time',
               property_name == 'min_fps', 'Minimum Frame Rate',
               property_name == 'avg_fps', 'Average Frame Rate',
               property_name == 'max_fps', 'Maximum Frame Rate',
               property_name == 'min_cpu', 'Minimum CPU',
               property_name == 'avg_cpu', 'Average CPU',
               property_name == 'max_cpu', 'Maximum CPU',
               property_name == 'min_total_js_heap_size', 'Minimum Total JS Heap Size',
               property_name == 'avg_total_js_heap_size', 'Average Total JS Heap Size',
               property_name == 'max_total_js_heap_size', 'Maximum Total JS Heap Size',
               property_name == 'min_used_js_heap_size', 'Minimum Used JS Heap Size',
               property_name == 'avg_used_js_heap_size', 'Average Used JS Heap Size',
               property_name == 'max_used_js_heap_size', 'Maximum Used JS Heap Size',
               property_name == 'method', 'Method',
               property_name == 'status', 'Status',
               property_name == 'success', 'Success',
               property_name == 'request_body', 'Request Body',
               property_name == 'response_body', 'Response Body',
               property_name == 'transfer_size', 'Transfer Size',
               property_name == 'selector', 'Selector',
               property_name == 'normalized_x', 'Normalized X',
               property_name == 'normalized_y', 'Normalized Y',
               property_name == 'message_id', 'Message ID',
               '')                        AS display_name,
       description,
       if(status = '', 'visible', status) AS status,
       data_count,
       query_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
         LEFT JOIN (SELECT project_id,
                           property_name,
                           display_name,
                           description,
                           status,
                           data_count,
                           query_count
                    FROM product_analytics.all_properties
                    WHERE (all_properties.display_name != ''
                        OR all_properties.description != '')
                      AND is_event_property) AS old_data
                   ON (events.project_id = old_data.project_id AND property_name = old_data.property_name)
WHERE `$auto_captured`
-- @formatter:off
UNION DISTINCT
-- @formatter:on
-- not auto-captured, from '$properties' (doesn't have predefined display-name)
SELECT project_id,
       property_name,
       TRUE                               AS is_event_property,
       display_name,
       description,
       if(status = '', 'visible', status) AS status,
       data_count,
       query_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
         LEFT JOIN (SELECT project_id,
                           property_name,
                           display_name,
                           description,
                           status,
                           data_count,
                           query_count
                    FROM product_analytics.all_properties
                    WHERE (all_properties.display_name != ''
                        OR all_properties.description != '')
                      AND is_event_property) AS old_data
                   ON (events.project_id = old_data.project_id AND property_name = old_data.property_name)
WHERE NOT `$auto_captured`
-- @formatter:off
UNION DISTINCT
-- @formatter:on
-- custom properties, from 'properties'
SELECT project_id,
       property_name,
       TRUE                               AS is_event_property,
       display_name,
       description,
       if(status = '', 'visible', status) AS status,
       data_count,
       query_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name
         LEFT JOIN (SELECT project_id,
                           property_name,
                           display_name,
                           description,
                           status,
                           data_count,
                           query_count
                    FROM product_analytics.all_properties
                    WHERE (all_properties.display_name != ''
                        OR all_properties.description != '')
                      AND is_event_property) AS old_data
                   ON (events.project_id = old_data.project_id AND property_name = old_data.property_name);

CREATE TABLE IF NOT EXISTS product_analytics.property_values_samples
(
    project_id        UInt16,
    property_name     String,
    is_event_property BOOL,
    value             String,

    _timestamp        DateTime DEFAULT now()
)
    ENGINE = ReplacingMergeTree(_timestamp)
        ORDER BY (project_id, property_name, is_event_property);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.property_values_sampler_mv
    -- @formatter:off
    REFRESH EVERY 30 HOUR TO product_analytics.property_values_samples AS
    -- @formatter:on
SELECT project_id,
       property_name,
       TRUE                                                      AS is_event_property,
       JSONExtractString(toString(`$properties`), property_name) AS value
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
WHERE randCanonical() < 0.5 -- This randomly skips inserts
  AND value != ''
LIMIT 2 BY project_id,property_name
-- @formatter:off
UNION DISTINCT
-- @formatter:on
SELECT project_id,
       property_name,
       TRUE                                                     AS is_event_property,
       JSONExtractString(toString(`properties`), property_name) AS value
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name
WHERE randCanonical() < 0.5 -- This randomly skips inserts
  AND value != ''
LIMIT 2 BY project_id,property_name;

-- Autocomplete

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_events
(
    project_id UInt16,
    value      String COMMENT 'The $event_name',
    _timestamp DateTime
) ENGINE = MergeTree()
      ORDER BY (project_id, value, _timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_events_mv
    TO product_analytics.autocomplete_events AS
SELECT project_id,
       `$event_name` AS value,
       _timestamp
FROM product_analytics.events
WHERE _timestamp > now() - INTERVAL 1 MONTH;

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_events_grouped
(
    project_id UInt16,
    value      String COMMENT 'The $event_name',
    data_count UInt16 COMMENT 'The number of appearance during the past month',
    _timestamp DateTime
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_events_grouped_mv
    -- @formatter:off
    REFRESH EVERY 30 MINUTE TO product_analytics.autocomplete_events_grouped AS
    -- @formatter:on
SELECT project_id,
       value,
       count(1)        AS data_count,
       max(_timestamp) AS _timestamp
FROM product_analytics.autocomplete_events
WHERE autocomplete_events._timestamp > now() - INTERVAL 1 MONTH
GROUP BY project_id, value;

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_event_properties
(
    project_id    UInt16,
    event_name    String COMMENT 'The $event_name',
    property_name String,
    value         String COMMENT 'The property-value as a string',
    _timestamp    DateTime DEFAULT now()
) ENGINE = MergeTree()
      ORDER BY (project_id, event_name, property_name, value, _timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_properties_mv
    TO product_analytics.autocomplete_event_properties AS
SELECT project_id,
       `$event_name`                                             AS event_name,
       property_name,
       JSONExtractString(toString(`$properties`), property_name) AS value,
       _timestamp
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
WHERE length(value) > 0
  AND isNull(toFloat64OrNull(value))
  AND _timestamp > now() - INTERVAL 1 MONTH
-- @formatter:off
UNION DISTINCT
-- @formatter:on
SELECT project_id,
       `$event_name`                                            AS event_name,
       property_name,
       JSONExtractString(toString(`properties`), property_name) AS value,
       _timestamp
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name
WHERE length(value) > 0
  AND isNull(toFloat64OrNull(value))
  AND _timestamp > now() - INTERVAL 1 MONTH;


CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped
(
    project_id    UInt16,
    event_name    String COMMENT 'The $event_name',
    property_name String,
    value         String COMMENT 'The property-value as a string',
    data_count    UInt16 COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped_mv
    -- @formatter:off
    REFRESH EVERY 30 MINUTE TO product_analytics.autocomplete_event_properties_grouped AS
    -- @formatter:on
SELECT project_id,
       event_name,
       property_name,
       value,
       count(1)        AS data_count,
       max(_timestamp) AS _timestamp
FROM product_analytics.autocomplete_event_properties
WHERE length(value) > 0
  AND autocomplete_event_properties._timestamp > now() - INTERVAL 1 MONTH
GROUP BY project_id, event_name, property_name, value;

ALTER TABLE product_analytics.users
    ADD COLUMN IF NOT EXISTS "$current_path" String MATERIALIZED path("$current_url");

ALTER TABLE product_analytics.events
    ADD COLUMN IF NOT EXISTS "$current_path" String MATERIALIZED path("$current_url");


CREATE TABLE IF NOT EXISTS experimental.parsed_errors
(
    project_id           UInt16,
    error_id             String,
    stacktrace           String,
    stacktrace_parsed_at DateTime DEFAULT now(),
    is_deleted           UInt8
) ENGINE = ReplacingMergeTree(stacktrace_parsed_at, is_deleted)
      ORDER BY (project_id, error_id);