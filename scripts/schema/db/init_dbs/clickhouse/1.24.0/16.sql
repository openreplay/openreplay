CREATE TABLE IF NOT EXISTS product_analytics.all_properties
(
    project_id        UInt16,
    source            Enum8('sessions'=0,'users'=1,'events'=2),
    property_name     String,
    is_event_property BOOL,
    auto_captured     BOOL,
    display_name      String                 DEFAULT '',
    description       String                 DEFAULT '',
    status            LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',
    data_count        UInt32                 DEFAULT 1,
    query_count       UInt32                 DEFAULT 0,

    created_at        DateTime64,
    _edited_by_user   BOOL                   DEFAULT FALSE,
    _timestamp        DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, source, property_name, is_event_property, auto_captured);

DROP TABLE IF EXISTS product_analytics.all_properties_extractor_mv;
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
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 16;
