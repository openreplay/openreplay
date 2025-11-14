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

CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0';

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
    _edited_by_user     BOOL     DEFAULT FALSE,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, auto_captured, event_name);

CREATE OR REPLACE FUNCTION or_event_display_name AS(event_name)->multiIf(
        event_name == 'CLICK', 'Click',
        event_name == 'INPUT', 'Text Input',
        event_name == 'LOCATION', 'Page View',
        event_name == 'ERROR', 'Error',
        event_name == 'REQUEST', 'Network Request',
        event_name == 'PERFORMANCE', 'Performance',
        event_name == 'ISSUE', 'Issue',
        event_name == 'INCIDENT', 'Incident',
        event_name == 'TAG_TRIGGER', 'Tag',
        '');

CREATE OR REPLACE FUNCTION or_event_description AS(event_name)->multiIf(
        event_name == 'CLICK',
        'Represents a user click on a webpage element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CLICK".\n\nContains element selector, text content, …, timestamp.',
        event_name == 'INPUT',
        'Represents text input by a user in form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".\n\nContains the element selector, ….. and timestamp (actual text content may be masked for privacy).',
        event_name == 'LOCATION',
        'Represents a page navigation or URL change within your application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "LOCATION".\n\nContains the full URL, …. referrer information, UTM parameters and timestamp.',
        event_name == 'ERROR',
        'Represents JavaScript errors and console error messages captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "error".\n\nContains error message,…., and timestamp.',
        event_name == 'REQUEST',
        'Represents HTTP/HTTPS network activity from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "fetch".\n\nContains URL, method, status code, duration, and timestamp',
        ''
                                                                );
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured`                                                                  AS auto_captured,
       `$event_name`                                                                     AS event_name,
       if(old_data.created_at != '1970-01-01 00:00:00', old_data.created_at, created_at) AS created_at,
       multiIf(_edited_by_user AND notEmpty(old_data.display_name), old_data.display_name,
               not `$auto_captured`, '',
               or_event_display_name(`$event_name`))                                     AS display_name,
       multiIf(_edited_by_user AND notEmpty(old_data.description), old_data.description,
               not `$auto_captured`, '',
               or_event_description(`$event_name`))                                      AS description,
       coalesce(old_data._edited_by_user, FALSE)                                         AS _edited_by_user
FROM product_analytics.events
         LEFT JOIN (SELECT project_id,
                           auto_captured,
                           event_name,
                           display_name,
                           description,
                           created_at,
                           _edited_by_user
                    FROM product_analytics.all_events
                    ORDER BY _timestamp DESC
                    LIMIT 1 BY project_id,auto_captured,event_name) AS old_data
                   ON (events.project_id = old_data.project_id
                       AND events.`$auto_captured` = old_data.auto_captured
                       AND events.`$event_name` = old_data.event_name)
GROUP BY ALL;
-- -------- END ---------

DROP TABLE IF EXISTS product_analytics.event_properties;
CREATE TABLE IF NOT EXISTS product_analytics.event_properties
(
    project_id             UInt16,
    event_name             String,
    property_name          String,
    value_type             String,
    auto_captured_event    BOOL,
    auto_captured_property BOOL,

    created_at             DateTime64,
    _timestamp             DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name, value_type, auto_captured_event, auto_captured_property);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_dproperties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`                                                              AS event_name,
       property_name,
       toString(JSONType(JSONExtractRaw(toString(`$properties`), property_name))) AS value_type,
       `$auto_captured`                                                           AS auto_captured_event,
       TRUE                                                                       AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_properties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`                                                             AS event_name,
       property_name,
       toString(JSONType(JSONExtractRaw(toString(`properties`), property_name))) AS value_type,
       `$auto_captured`                                                          AS auto_captured_event,
       FALSE                                                                     AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.all_properties;
CREATE TABLE IF NOT EXISTS product_analytics.all_properties
(
    project_id        UInt16,
    property_name     String,
    is_event_property BOOL,
    auto_captured     BOOL,
    display_name      String                 DEFAULT '',
    description       String                 DEFAULT '',
    status            LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',
    data_count        UInt32                 DEFAULT 1,
    query_count       UInt32                 DEFAULT 0,

    created_at        DateTime64,
    _edited_by_user   BOOL                   DEFAULT FALSE,
    _timestamp        DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, property_name, is_event_property, auto_captured);

CREATE OR REPLACE FUNCTION or_property_display_name AS(property_name)->multiIf(
        property_name == 'label', 'Label',
        property_name == 'hesitation_time', 'Hesitation Time',
        property_name == 'name', 'Name',
        property_name == 'payload', 'Payload',
        property_name == 'level', 'Level',
        property_name == 'source', 'Source',
        property_name == 'duration', 'Duration',
        property_name == 'context', 'Context',
        property_name == 'url_host', 'Hostname',
        property_name == 'url_path', 'Path',
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
        property_name == 'success', 'Success',
        property_name == 'request_body', 'Request Body',
        property_name == 'response_body', 'Response Body',
        property_name == 'transfer_size', 'Transfer Size',
        property_name == 'selector', 'CSS Selector',
        property_name == 'normalized_x', 'Normalized X',
        property_name == 'normalized_y', 'Normalized Y',
        property_name == 'message_id', 'Message ID',
        property_name == 'cls', 'Cumulative Layout Shift',
        property_name == 'lcp', 'Largest Contentful Paint',
        property_name == 'issue_type', 'Issue Type',
        property_name == 'url', 'URL',
        property_name == 'user_device', 'Device',
        property_name == 'user_device_type', 'Platform',
        property_name == 'message', 'Error Message',
        property_name == 'method', 'HTTP Method',
        property_name == 'status', 'Status Code',
        property_name == 'userState', 'State/Province',
        property_name == 'incident', 'Incident Reported By User',
        property_name == 'page_title', 'Page Title',
        '');

CREATE OR REPLACE FUNCTION or_property_visibility AS(property_name)->multiIf(
        property_name == 'label', 'visible',
        property_name == 'tag_id', 'hidden',
        property_name == 'inp', 'hidden',
        property_name == 'web_vitals', 'hidden',
        property_name = 'duration', 'visible',
        property_name = 'avg_cpu', 'hidden',
        property_name = 'avg_fps', 'hidden',
        property_name = 'avg_total_js_heap_size', 'hidden',
        property_name = 'avg_used_js_heap_size', 'hidden',
        property_name = 'dom_building_time', 'hidden',
        property_name = 'dom_content_loaded_event_end', 'hidden',
        property_name = 'dom_content_loaded_event_start', 'hidden',
        property_name = 'dom_content_loaded_event_time', 'hidden',
        property_name = 'first_paint', 'hidden',
        property_name = 'load_event_end', 'hidden',
        property_name = 'load_event_start', 'hidden',
        property_name = 'load_event_time', 'hidden',
        property_name = 'url_hostpath', 'hidden',
        property_name = 'visually_complete', 'hidden',
        property_name = 'time_to_interactive', 'hidden',
        property_name = 'ttlb', 'hidden',
        property_name = 'transfer_size', 'hidden',
        property_name = 'source', 'hidden',
        property_name = 'request_start', 'hidden',
        property_name = 'response_end', 'hidden',
        property_name = 'response_start', 'hidden',
        property_name = 'response_time', 'hidden',
        property_name = 'normalized_x', 'visible',
        property_name = 'normalized_y', 'visible',
        property_name = 'max_total_js_heap_size', 'hidden',
        property_name = 'min_total_js_heap_size', 'hidden',
        property_name = 'userAnonymousId', 'hidden',
        'visible');


CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_properties_extractor_mv
    TO product_analytics.all_properties AS
(
SELECT project_id,
       property_name,
       TRUE                                                                                               AS is_event_property,
       auto_captured_property                                                                             AS auto_captured,
--        Think about display name if autocaptured and not autocaptured
       multiIf(_edited_by_user OR not (auto_captured_property), old_data.display_name,
               or_property_display_name(property_name))                                                   AS display_name,
       old_data.description                                                                               AS description,
       multiIf(notEmpty(old_data.status), old_data.status,
               or_property_visibility(property_name))                                                     AS status,
       old_data.data_count,
       old_data.query_count,
       if(old_data.created_at != '1970-01-01 00:00:00', old_data.created_at, event_properties.created_at) AS created_at,
       if(isNotNull(old_data._edited_by_user), _edited_by_user, FALSE)                                    AS _edited_by_user
FROM product_analytics.event_properties
         LEFT JOIN (SELECT *
                    FROM product_analytics.all_properties
                    ORDER BY _timestamp DESC
                    LIMIT 1 BY project_id,property_name) AS old_data
                   ON (event_properties.project_id = old_data.project_id
                       AND event_properties.property_name = old_data.property_name));
-- -------- END ---------

DROP TABLE IF EXISTS product_analytics.property_values_samples;
CREATE TABLE IF NOT EXISTS product_analytics.property_values_samples
(
    project_id        UInt16,
    property_name     String,
    is_event_property BOOL,
    auto_captured     BOOL,
    value             String,

    _timestamp        DateTime DEFAULT now()
)
    ENGINE = ReplacingMergeTree(_timestamp)
        ORDER BY (project_id, property_name, is_event_property);
-- Incremental materialized view to get random examples of property values using $properties & properties
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.property_dvalues_sampler_mv
    TO product_analytics.property_values_samples AS
SELECT project_id,
       property_name,
       TRUE                                                      AS is_event_property,
       TRUE                                                      AS auto_captured,
       JSONExtractString(toString(`$properties`), property_name) AS value
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
WHERE randCanonical() < 0.5 -- This randomly skips inserts
  AND value != ''
LIMIT 2 BY project_id,property_name;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.property_values_sampler_mv
    TO product_analytics.property_values_samples AS
SELECT project_id,
       property_name,
       TRUE                                                     AS is_event_property,
       FALSE                                                    AS auto_captured,
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

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_dproperties_mv
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
  AND _timestamp > now() - INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_properties_mv
    TO product_analytics.autocomplete_event_properties AS
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

ALTER TABLE experimental.sessions
    DROP COLUMN IF EXISTS issue_score;

ALTER TABLE experimental.events
    MODIFY COLUMN issue_type Nullable(Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22));

ALTER TABLE experimental.issues
    MODIFY COLUMN type Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22);

ALTER TABLE product_analytics.events
    MODIFY COLUMN issue_type Enum8(''=0,'click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22) DEFAULT '';


-- Autocomplete for all values not related to events (browser/metadata/country/...)
CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_simple
(
    project_id    UInt16,
    auto_captured bool,
    source        Enum8('session'=0),
    name          LowCardinality(String),
    value         String,
    _timestamp    DateTime
) ENGINE = MergeTree()
      ORDER BY (project_id, auto_captured, source, name, value, _timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_browser_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE           AS auto_captured,
       'session'      AS source,
       'user_browser' AS name,
       user_browser   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_browser);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_country_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                   AS auto_captured,
       'session'              AS source,
       'user_country'         AS name,
       toString(user_country) AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(toString(user_country));

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_state_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'user_state' AS name,
       user_state   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_state);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_city_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE        AS auto_captured,
       'session'   AS source,
       'user_city' AS name,
       user_city   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_city);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_device_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE          AS auto_captured,
       'session'     AS source,
       'user_device' AS name,
       user_device   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_device);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_rev_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE      AS auto_captured,
       'session' AS source,
       'rev_id'  AS name,
       rev_id    AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(rev_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_referrer_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE       AS auto_captured,
       'session'  AS source,
       'referrer' AS name,
       referrer   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(referrer);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_source_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'utm_source' AS name,
       referrer     AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(utm_source);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_medium_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'utm_medium' AS name,
       referrer     AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(utm_medium);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_campaign_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE           AS auto_captured,
       'session'      AS source,
       'utm_campaign' AS name,
       referrer       AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(utm_campaign);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE     AS auto_captured,
       'session' AS source,
       'user_id' AS name,
       user_id   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE               AS auto_captured,
       'session'           AS source,
       'user_anonymous_id' AS name,
       user_anonymous_id   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(user_anonymous_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_1_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_1' AS name,
       metadata_1   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_1);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_2_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_2' AS name,
       metadata_2   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_2);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_3_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_3' AS name,
       metadata_3   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_3);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_4_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_4' AS name,
       metadata_4   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_4);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_5_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_5' AS name,
       metadata_5   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_5);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_6_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_6' AS name,
       metadata_6   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_6);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_7_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_7' AS name,
       metadata_7   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_7);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_8_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_8' AS name,
       metadata_8   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_8);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_9_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_9' AS name,
       metadata_9   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_9);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_10_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE         AS auto_captured,
       'session'     AS source,
       'metadata_10' AS name,
       metadata_10   AS value,
       _timestamp
FROM experimental.sessions
WHERE notEmpty(metadata_10);