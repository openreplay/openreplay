CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0-ee';


-- The full list of event-properties (used to tell which property belongs to which event)
CREATE TABLE IF NOT EXISTS product_analytics.event_properties
(
    project_id    UInt16,
    event_name    String,
    property_name String,

    _timestamp    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name);

DROP TABLE IF EXISTS product_analytics.all_events;
CREATE TABLE IF NOT EXISTS product_analytics.all_events
(
    project_id          UInt16,
    auto_captured       BOOL     DEFAULT FALSE,
    event_name          String,
    display_name        String   DEFAULT '',
    description         String   DEFAULT '',
    event_count_l30days UInt32   DEFAULT 0,
    query_count_l30days UInt32   DEFAULT 0,

    created_at          DateTime64,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, auto_captured, event_name);