CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0';


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
