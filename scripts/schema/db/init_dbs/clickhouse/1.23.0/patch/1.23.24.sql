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

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_browser_version_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                           AS auto_captured,
       'session'                      AS source,
       'user_browser_version'         AS name,
       toString(user_browser_version) AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_browser_version)
  AND notEmpty(user_browser_version);

-- changes for simple-autocomplete
RENAME TABLE product_analytics.autocomplete_simple TO product_analytics.autocomplete_simple_old;

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_simple
(
    project_id    UInt16,
    auto_captured bool,
    source        Enum8('session'=0),
    name          LowCardinality(String),
    value         String,
    data_count    AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, auto_captured, source, name, value)
      TTL _timestamp + INTERVAL 1 MONTH;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_browser_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_browser_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                   AS auto_captured,
       'session'              AS source,
       'user_browser'         AS name,
       toString(user_browser) AS value,
       sumState(toUInt16(1))  AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_browser)
  AND notEmpty(user_browser)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_browser_version_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_browser_version_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                           AS auto_captured,
       'session'                      AS source,
       'user_browser_version'         AS name,
       toString(user_browser_version) AS value,
       sumState(toUInt16(1))          AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_browser_version)
  AND notEmpty(user_browser_version)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_country_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_country_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                   AS auto_captured,
       'session'              AS source,
       'user_country'         AS name,
       toString(user_country) AS value,
       sumState(toUInt16(1))  AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_country)
  AND notEmpty(toString(user_country))
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_state_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_state_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'user_state'          AS name,
       toString(user_state)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_state)
  AND notEmpty(user_state)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_city_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_city_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'user_city'           AS name,
       toString(user_city)   AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_city)
  AND notEmpty(user_city)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_device_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_device_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'user_device'         AS name,
       toString(user_device) AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_device)
  AND notEmpty(user_device)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_rev_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_rev_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'rev_id'              AS name,
       toString(rev_id)      AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(rev_id)
  AND notEmpty(rev_id)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_referrer_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_referrer_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'referrer'            AS name,
       toString(referrer)    AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(referrer)
  AND notEmpty(referrer)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_source_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_source_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'utm_source'          AS name,
       toString(utm_source)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_source)
  AND notEmpty(utm_source)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_medium_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_medium_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                  AS auto_captured,
       'session'             AS source,
       'utm_medium'          AS name,
       toString(utm_medium)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_medium)
  AND notEmpty(utm_medium)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_campaign_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_campaign_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                   AS auto_captured,
       'session'              AS source,
       'utm_campaign'         AS name,
       toString(utm_campaign) AS value,
       sumState(toUInt16(1))  AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_campaign)
  AND notEmpty(utm_campaign)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'user_id'             AS name,
       toString(user_id)     AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_id)
  AND notEmpty(user_id)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                       AS auto_captured,
       'session'                   AS source,
       'user_anonymous_id'         AS name,
       toString(user_anonymous_id) AS value,
       sumState(toUInt16(1))       AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_anonymous_id)
  AND notEmpty(user_anonymous_id)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_1_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_1_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_1'          AS name,
       toString(metadata_1)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_1)
  AND notEmpty(metadata_1)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_2_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_2_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_2'          AS name,
       toString(metadata_2)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_2)
  AND notEmpty(metadata_2)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_3_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_3_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_3'          AS name,
       toString(metadata_3)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_3)
  AND notEmpty(metadata_3)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_4_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_4_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_4'          AS name,
       toString(metadata_4)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_4)
  AND notEmpty(metadata_4)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_5_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_5_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_5'          AS name,
       toString(metadata_5)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_5)
  AND notEmpty(metadata_5)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_6_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_6_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_6'          AS name,
       toString(metadata_6)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_6)
  AND notEmpty(metadata_6)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_7_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_7_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_7'          AS name,
       toString(metadata_7)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_7)
  AND notEmpty(metadata_7)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_8_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_8_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_8'          AS name,
       toString(metadata_8)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_8)
  AND notEmpty(metadata_8)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_9_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_9_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_9'          AS name,
       toString(metadata_9)  AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_9)
  AND notEmpty(metadata_9)
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_10_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_10_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE                 AS auto_captured,
       'session'             AS source,
       'metadata_10'         AS name,
       toString(metadata_10) AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_10)
  AND notEmpty(metadata_10)
GROUP BY ALL;



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
--
-- INSERT INTO product_analytics.autocomplete_simple
--     SETTINGS async_insert = 1, wait_for_async_insert = 0
-- SELECT project_id,
--        auto_captured,
--        source,
--        name,
--        value,
--        sumState(data_count) AS data_count,
--        now()                AS _timestamp
-- FROM (SELECT project_id,
--              auto_captured,
--              source,
--              name,
--              value,
--              toUInt16(count(1)) AS data_count
--       FROM product_analytics.autocomplete_simple_old
--       GROUP BY ALL)
-- GROUP BY ALL;
--
-- TRUNCATE TABLE IF EXISTS product_analytics.autocomplete_simple_old;