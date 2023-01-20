ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS utm_source   Nullable(String),
    ADD COLUMN IF NOT EXISTS utm_medium   Nullable(String),
    ADD COLUMN IF NOT EXISTS utm_campaign Nullable(String);
