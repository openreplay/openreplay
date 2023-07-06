CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.14.0-ee';


CREATE TABLE IF NOT EXISTS experimental.sessions_feature_flags
(
    session_id      UInt64,
    project_id      UInt16,
    feature_flag_id UInt16,
    condition_id    UInt16,
    datetime        DateTime,
    _timestamp      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, session_id, feature_flag_id, condition_id)
      TTL datetime + INTERVAL 3 MONTH;