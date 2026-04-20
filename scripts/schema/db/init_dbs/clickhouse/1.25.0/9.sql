CREATE TABLE IF NOT EXISTS product_analytics.all_events_customized
(
    project_id    UInt16,
    auto_captured BOOL                   DEFAULT FALSE,
    event_name    String,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, auto_captured, event_name);

CREATE TABLE IF NOT EXISTS product_analytics.all_properties_customized
(
    project_id    UInt16,
    source        Enum8('sessions'=0,'users'=1,'events'=2),
    property_name String,
    auto_captured BOOL,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, source, property_name, auto_captured);

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
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> -1;
