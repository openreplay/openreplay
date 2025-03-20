CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.23.0';


CREATE TABLE IF NOT EXISTS experimental.user_viewed_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id)
      TTL _timestamp + INTERVAL 3 MONTH;

-- The full list of event-properties (used to tell which property belongs to which event)
CREATE TABLE IF NOT EXISTS product_analytics.event_properties
(
    project_id    UInt16,
    event_name    String,
    property_name String,

    _timestamp    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name);
