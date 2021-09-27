BEGIN;

CREATE INDEX sessions_user_id_useridNN_idx ON sessions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX sessions_uid_projectid_startts_sessionid_uidNN_durGTZ_idx ON sessions (user_id, project_id, start_ts, session_id) WHERE user_id IS NOT NULL AND duration > 0;
CREATE INDEX pages_base_path_base_pathLNGT2_idx ON events.pages (base_path) WHERE length(base_path) > 2;

CREATE INDEX users_tenant_id_deleted_at_N_idx ON users (tenant_id) WHERE deleted_at ISNULL;
CREATE INDEX issues_issue_id_timestamp_idx ON events_common.issues(issue_id,timestamp);
CREATE INDEX issues_timestamp_idx ON events_common.issues (timestamp);
CREATE INDEX issues_project_id_issue_id_idx ON public.issues (project_id, issue_id);
COMMIT;