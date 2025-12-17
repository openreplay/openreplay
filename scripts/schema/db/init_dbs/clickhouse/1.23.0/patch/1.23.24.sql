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

-- changes for sample-values:
DROP TABLE IF EXISTS product_analytics.property_dvalues_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_samples;


-- -- Use the following queries to copy existing data to the new autocomplete table
-- INSERT INTO product_analytics.autocomplete_events_grouped
--     SETTINGS async_insert = 1, wait_for_async_insert = 0
-- SELECT project_id,
--        value,
--        sumState(toUInt16(1)) AS data_count,
--        _timestamp
-- FROM product_analytics.autocomplete_events
-- WHERE value != ''
-- GROUP BY ALL;
--
-- TRUNCATE TABLE IF EXISTS product_analytics.autocomplete_events;
--
-- INSERT INTO product_analytics.autocomplete_event_properties_grouped
--     SETTINGS async_insert = 1, wait_for_async_insert = 0
-- SELECT project_id,
--        event_name,
--        property_name,
--        value,
--        sumState(toUInt16(1)) AS data_count,
--        _timestamp
-- FROM product_analytics.autocomplete_event_properties
-- GROUP BY ALL;
--
-- TRUNCATE TABLE IF EXISTS product_analytics.autocomplete_event_properties;

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
        property_name = 'user_device', 'hidden',
        'visible');


