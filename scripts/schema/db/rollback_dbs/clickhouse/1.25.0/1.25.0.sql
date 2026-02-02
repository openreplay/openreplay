CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.24.0';


DROP TABLE IF EXISTS product_analytics.autocomplete_simple_events_mv;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_users_mv;

ALTER TABLE product_analytics.all_events
    ADD COLUMN IF NOT EXISTS display_name    String DEFAULT '',
    ADD COLUMN IF NOT EXISTS description     String DEFAULT '',
    ADD COLUMN IF NOT EXISTS status          LowCardinality(String),
    ADD COLUMN IF NOT EXISTS _edited_by_user BOOL   DEFAULT FALSE;

ALTER TABLE product_analytics.all_properties
    ADD COLUMN IF NOT EXISTS display_name    String DEFAULT '',
    ADD COLUMN IF NOT EXISTS description     String DEFAULT '',
    ADD COLUMN IF NOT EXISTS status          LowCardinality(String),
    ADD COLUMN IF NOT EXISTS _edited_by_user BOOL   DEFAULT FALSE;

DROP TABLE IF EXISTS product_analytics.all_events_customized;

DROP TABLE IF EXISTS product_analytics.all_properties_customized;

DROP TABLE IF EXISTS product_analytics.events_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.events_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'events'                                AS source,
       property_name,
       TRUE                                    AS is_event_property,
       auto_captured_property                  AS auto_captured,
       or_property_display_name(property_name) AS display_name,
       ''                                      AS description,
       or_property_visibility(property_name)   AS status,
       0                                       AS data_count,
       0                                       AS query_count,
       event_properties.created_at             AS created_at,
       FALSE                                   AS _edited_by_user
FROM product_analytics.event_properties;

DROP TABLE IF EXISTS product_analytics.users_all_properties_extractor_mv;

DROP TABLE IF EXISTS product_analytics.all_events_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured`                     AS auto_captured,
       `$event_name`                        AS event_name,
       created_at                           AS created_at,
       or_event_display_name(`$event_name`) AS display_name,
       or_event_description(`$event_name`)  AS description,
       FALSE                                AS _edited_by_user
FROM product_analytics.events
GROUP BY ALL;
