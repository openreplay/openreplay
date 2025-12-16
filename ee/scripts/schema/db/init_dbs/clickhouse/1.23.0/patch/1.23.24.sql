-- This is a patch to make the DB works with chalice v1.23.24+

-- changes for properties-autocomplete
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

DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_dproperties_mv;

INSERT INTO product_analytics.autocomplete_event_properties_grouped
SELECT project_id,
       event_name,
       property_name,
       value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.autocomplete_event_properties
GROUP BY ALL;

TRUNCATE TABLE IF EXISTS product_analytics.autocomplete_event_properties;


-- changes for events-autocomplete
DROP TABLE IF EXISTS product_analytics.autocomplete_events_grouped_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_events_grouped;

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_events_grouped
(
    project_id UInt16,
    value      String COMMENT 'The $event_name',
    data_count AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp DateTime
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_events_grouped_mv
    TO product_analytics.autocomplete_events_grouped AS
SELECT project_id,
       `$event_name`         AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
WHERE value != ''
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_events_mv;

INSERT INTO product_analytics.autocomplete_events_grouped
SELECT project_id,
       value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.autocomplete_events
WHERE value != ''
GROUP BY ALL;

TRUNCATE TABLE IF EXISTS product_analytics.autocomplete_events;

-- changes for sample-values:
DROP TABLE IF EXISTS product_analytics.property_dvalues_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_samples;