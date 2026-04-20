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
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 5;
