ALTER TABLE sessions
    ADD COLUMN utm_source   Nullable(String),
    ADD COLUMN utm_medium   Nullable(String),
    ADD COLUMN utm_campaign Nullable(String);
