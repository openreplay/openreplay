BEGIN;

CREATE INDEX IF NOT EXISTS sessions_user_id_useridNN_idx ON public.sessions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sessions_uid_projectid_startts_sessionid_uidNN_durGTZ_idx ON public.sessions (user_id, project_id, start_ts, session_id) WHERE user_id IS NOT NULL AND duration > 0;
CREATE INDEX IF NOT EXISTS pages_base_path_base_pathLNGT2_idx ON events.pages (base_path) WHERE length(base_path) > 2;


CREATE INDEX IF NOT EXISTS clicks_session_id_timestamp_idx ON events.clicks (session_id, timestamp);
CREATE INDEX IF NOT EXISTS errors_error_id_idx ON public.errors (error_id);
CREATE INDEX IF NOT EXISTS errors_error_id_idx ON events.errors (error_id);

CREATE INDEX IF NOT EXISTS issues_issue_id_timestamp_idx ON events_common.issues(issue_id,timestamp);
CREATE INDEX IF NOT EXISTS issues_timestamp_idx ON events_common.issues (timestamp);
CREATE INDEX IF NOT EXISTS issues_project_id_issue_id_idx ON public.issues (project_id, issue_id);

COMMIT;
