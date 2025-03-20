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
