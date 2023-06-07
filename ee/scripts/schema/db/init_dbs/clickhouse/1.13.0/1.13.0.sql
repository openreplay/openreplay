CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.13.0-ee';


ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS user_city LowCardinality(String),
    ADD COLUMN IF NOT EXISTS user_state LowCardinality(String);