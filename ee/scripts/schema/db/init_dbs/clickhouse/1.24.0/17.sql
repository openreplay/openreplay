SELECT throwIf((SELECT openreplay_migration_state()) != 16, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.user_properties;
CREATE TABLE IF NOT EXISTS product_analytics.user_properties
(
    project_id             UInt16,
    user_id                String,
    property_name          String,
    value_type             String,
    auto_captured_property BOOL,

    _timestamp             DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, property_name, value_type, auto_captured_property);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.user_properties_extractor_mv
    TO product_analytics.user_properties AS
SELECT project_id,
       `$user_id` AS user_id,
       a.1        AS property_name,
       a.2        AS value_type,
       FALSE      AS auto_captured_property
FROM product_analytics.users
         ARRAY JOIN JSONAllPathsWithTypes(`properties`) AS a
GROUP BY ALL;

DROP TABLE IF EXISTS product_analytics.users_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.users_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'users'                                 AS source,
       property_name,
       FALSE                                   AS is_event_property,
       auto_captured_property                  AS auto_captured,
       or_property_display_name(property_name) AS display_name,
       ''                                      AS description,
       or_property_visibility(property_name)   AS status,
       0                                       AS data_count,
       0                                       AS query_count,
       _timestamp                              AS created_at,
       FALSE                                   AS _edited_by_user
FROM product_analytics.user_properties;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 17;
