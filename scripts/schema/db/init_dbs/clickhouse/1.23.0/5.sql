SELECT throwIf((SELECT openreplay_migration_state()) != 4, 'Previous step is not done') AS check;

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

DROP TABLE IF EXISTS product_analytics.event_dproperties_extractor_mv SYNC;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_dproperties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`    AS event_name,
       a.1              AS property_name,
       a.2              AS value_type,
       `$auto_captured` AS auto_captured_event,
       TRUE             AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONAllPathsWithTypes(`$properties`) AS a
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.event_properties_extractor_mv SYNC;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_properties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`    AS event_name,
       a.1              AS property_name,
       a.2              AS value_type,
       `$auto_captured` AS auto_captured_event,
       FALSE            AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONAllPathsWithTypes(`properties`) AS a
GROUP BY ALL;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 5;
