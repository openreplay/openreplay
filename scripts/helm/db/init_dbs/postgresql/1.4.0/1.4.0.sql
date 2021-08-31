BEGIN;
CREATE INDEX pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);


COMMIT;