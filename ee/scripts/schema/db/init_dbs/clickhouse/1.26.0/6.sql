SELECT throwIf((SELECT openreplay_migration_state()) != 5, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.events_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.events_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'events'                    AS source,
       property_name,
       TRUE                        AS is_event_property,
       auto_captured_property      AS auto_captured,
       0                           AS data_count,
       0                           AS query_count,
       event_properties.created_at AS created_at
FROM product_analytics.event_properties;

DROP TABLE IF EXISTS product_analytics.users_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.users_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'users'                AS source,
       property_name,
       FALSE                  AS is_event_property,
       auto_captured_property AS auto_captured,
       0                      AS data_count,
       0                      AS query_count,
       _timestamp             AS created_at
FROM product_analytics.user_properties;

DROP TABLE IF EXISTS product_analytics.all_events_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured` AS auto_captured,
       `$event_name`    AS event_name,
       created_at       AS created_at
FROM product_analytics.events
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.actions;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> -1;
