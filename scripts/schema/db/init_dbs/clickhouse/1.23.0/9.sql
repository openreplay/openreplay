SELECT throwIf((SELECT openreplay_migration_state()) != 8, 'Previous step is not done') AS check;

CREATE TABLE IF NOT EXISTS experimental.parsed_errors
(
    project_id           UInt16,
    error_id             String,
    stacktrace           String,
    stacktrace_parsed_at DateTime DEFAULT now(),
    is_deleted           UInt8
) ENGINE = ReplacingMergeTree(stacktrace_parsed_at, is_deleted)
      ORDER BY (project_id, error_id);
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 9;
