CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0-ee';

SET allow_experimental_json_type = 1;
SET enable_json_type = 1;
ALTER TABLE product_analytics.events
    MODIFY COLUMN `$properties` JSON(
max_dynamic_paths=0,
label                          String ,
hesitation_time                UInt32 ,
name                           String ,
payload                        String ,
level                          Enum8 ('info'=0, 'error'=1),
source                         Enum8 ('js_exception'=0, 'bugsnag'=1, 'cloudwatch'=2, 'datadog'=3, 'elasticsearch'=4, 'newrelic'=5, 'rollbar'=6, 'sentry'=7, 'stackdriver'=8, 'sumologic'=9),
message                        String ,
error_id                       String ,
duration                       UInt16,
context                        Enum8('unknown'=0, 'self'=1, 'same-origin-ancestor'=2, 'same-origin-descendant'=3, 'same-origin'=4, 'cross-origin-ancestor'=5, 'cross-origin-descendant'=6, 'cross-origin-unreachable'=7, 'multiple-contexts'=8),
url_host                       String ,
url_path                       String ,
url_hostpath                   String ,
request_start                  UInt16 ,
response_start                 UInt16 ,
response_end                   UInt16 ,
dom_content_loaded_event_start UInt16 ,
dom_content_loaded_event_end   UInt16 ,
load_event_start               UInt16 ,
load_event_end                 UInt16 ,
first_paint                    UInt16 ,
first_contentful_paint_time    UInt16 ,
speed_index                    UInt16 ,
visually_complete              UInt16 ,
time_to_interactive            UInt16,
ttfb                           UInt16,
ttlb                           UInt16,
response_time                  UInt16,
dom_building_time              UInt16,
dom_content_loaded_event_time  UInt16,
load_event_time                UInt16,
min_fps                        UInt8,
avg_fps                        UInt8,
max_fps                        UInt8,
min_cpu                        UInt8,
avg_cpu                        UInt8,
max_cpu                        UInt8,
min_total_js_heap_size         UInt64,
avg_total_js_heap_size         UInt64,
max_total_js_heap_size         UInt64,
min_used_js_heap_size          UInt64,
avg_used_js_heap_size          UInt64,
max_used_js_heap_size          UInt64,
method                         Enum8('GET' = 0, 'HEAD' = 1, 'POST' = 2, 'PUT' = 3, 'DELETE' = 4, 'CONNECT' = 5, 'OPTIONS' = 6, 'TRACE' = 7, 'PATCH' = 8),
status                         UInt16,
success                        UInt8,
request_body                   String,
response_body                  String,
transfer_size                  UInt32,
selector                       String,
normalized_x                   Float32,
normalized_y                   Float32,
message_id                     UInt64
) DEFAULT '{}' COMMENT 'these properties belongs to the auto-captured events';

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
                                                         display_name,
                                                         description
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

    _timestamp    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name, value_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_properties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`                                                    AS event_name,
       property_name,
       JSONType(JSONExtractRaw(toString(`$properties`), property_name)) AS value_type
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_cproperties_extractor
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`                                                   AS event_name,
       property_name,
       JSONType(JSONExtractRaw(toString(`properties`), property_name)) AS value_type
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
SELECT project_id,
       property_name,
       TRUE AS is_event_property,
       display_name,
       description,
       status,
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
                   ON (events.project_id = old_data.project_id AND property_name = old_data.property_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_cproperties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       property_name,
       TRUE AS is_event_property,
       display_name,
       description,
       status,
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
    REFRESH EVERY 30 HOUR TO product_analytics.property_values_samples AS
SELECT project_id,
       property_name,
       TRUE                                                      AS is_event_property,
       JSONExtractString(toString(`$properties`), property_name) AS value
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`$properties`)) as property_name
WHERE randCanonical() < 0.5 -- This randomly skips inserts
  AND value != ''
LIMIT 2 BY project_id,property_name
UNION ALL
SELECT project_id,
       property_name,
       TRUE                                                     AS is_event_property,
       JSONExtractString(toString(`properties`), property_name) AS value
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeys(toString(`properties`)) as property_name
WHERE randCanonical() < 0.5 -- This randomly skips inserts
  AND value != ''
LIMIT 2 BY project_id,property_name;
