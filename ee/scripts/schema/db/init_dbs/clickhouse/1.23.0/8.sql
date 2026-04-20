SELECT throwIf((SELECT openreplay_migration_state()) != 7, 'Previous step is not done') AS check;

-- TODO: remove this in v1.24.0
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

DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_dproperties_mv;

DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_grouped_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_dproperties_grouped_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_grouped;


CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped
(
    project_id    UInt16,
    event_name    String COMMENT 'The $event_name',
    property_name String,
    value         String COMMENT 'The property-value as a string',
    data_count    AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime DEFAULT now()
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, event_name, property_name, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped_mv
    TO product_analytics.autocomplete_event_properties_grouped AS
SELECT project_id,
       `$event_name`         AS event_name,
       a.1                   AS property_name,
       a.2                   AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeysAndValues(toString(`properties`), 'String') AS a
WHERE length(a.1) > 0
  AND isNull(toFloat64OrNull(a.1))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_dproperties_grouped_mv
    TO product_analytics.autocomplete_event_properties_grouped AS
SELECT project_id,
       `$event_name`         AS event_name,
       a.1                   AS property_name,
       a.2                   AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeysAndValues(toString(`$properties`), 'String') AS a
WHERE length(a.1) > 0
  AND isNull(toFloat64OrNull(a.1))
GROUP BY ALL;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 8;
