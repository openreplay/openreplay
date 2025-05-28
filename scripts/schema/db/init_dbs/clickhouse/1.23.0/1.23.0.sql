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
    REFRESH EVERY 30 MINUTE TO product_analytics.autocomplete_events_grouped AS
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
    REFRESH EVERY 30 MINUTE TO product_analytics.autocomplete_event_properties_grouped AS
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

