BEGIN ;

CREATE INDEX clicks_url_idx ON events.clicks (url);
CREATE INDEX clicks_url_gin_idx ON events.clicks USING GIN (url gin_trgm_ops);
CREATE INDEX clicks_url_session_id_timestamp_selector_idx ON events.clicks (url, session_id, timestamp,selector);

COMMIT ;