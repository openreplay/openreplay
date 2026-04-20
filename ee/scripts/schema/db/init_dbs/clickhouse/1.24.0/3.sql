SELECT throwIf((SELECT openreplay_migration_state()) != 2, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.users_distinct_id;
CREATE TABLE IF NOT EXISTS product_analytics.users_distinct_id
(
    project_id  UInt16,
    distinct_id String COMMENT 'this is the event\'s distinct_id',
    "$user_id"  String,

    _deleted_at DateTime DEFAULT '1970-01-01 00:00:00',
    _is_deleted UInt8    DEFAULT 0,
    _timestamp  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, distinct_id)
      PARTITION BY toMonday(_timestamp)
      TTL _deleted_at WHERE _deleted_at != '1970-01-01 00:00:00';
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 3;
