BEGIN;
CREATE INDEX projects_tenant_id_idx ON projects (tenant_id);
CREATE INDEX webhooks_tenant_id_idx ON webhooks (tenant_id);

CREATE INDEX pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);

CREATE INDEX issues_project_id_idx ON issues (project_id);
CREATE INDEX jobs_project_id_idx ON jobs (project_id);

COMMIT;