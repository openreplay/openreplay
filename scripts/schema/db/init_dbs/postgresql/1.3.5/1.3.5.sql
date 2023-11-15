BEGIN;
CREATE INDEX pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);

CREATE INDEX issues_project_id_idx ON public.issues (project_id);
CREATE INDEX jobs_project_id_idx ON public.jons (project_id);


COMMIT;