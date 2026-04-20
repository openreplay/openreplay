SELECT throwIf((SELECT openreplay_migration_state()) != 1, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.user_devices;
CREATE TABLE IF NOT EXISTS product_analytics.user_devices
(
    project_id   UInt16,
    "$device_id" String,
    "$user_id"   String,

    _deleted_at  DateTime DEFAULT '1970-01-01 00:00:00',
    _is_deleted  UInt8    DEFAULT 0,
    _timestamp   DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, "$device_id", "$user_id")
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 2;
