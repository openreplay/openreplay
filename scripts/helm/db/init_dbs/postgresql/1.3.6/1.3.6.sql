BEGIN;

CREATE INDEX sessions_user_id_useridNN_idx ON sessions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX sessions_uid_projectid_startts_sessionid_uidNN_durGTZ_idx ON sessions (user_id, project_id, start_ts, session_id) WHERE user_id IS NOT NULL AND duration > 0;
CREATE INDEX pages_base_path_base_pathLNGT2_idx ON events.pages (base_path) WHERE length(base_path) > 2;

CREATE INDEX clicks_session_id_timestamp_idx ON events.clicks (session_id, timestamp);
CREATE INDEX errors_error_id_idx ON errors (error_id);
CREATE INDEX errors_error_id_idx ON events.errors (error_id);
COMMIT;