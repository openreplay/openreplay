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
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 8;
