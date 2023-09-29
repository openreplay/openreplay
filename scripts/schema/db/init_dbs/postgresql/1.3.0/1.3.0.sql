BEGIN;
CREATE INDEX sessions_session_id_project_id_start_ts_durationNN_idx ON public.sessions (session_id, project_id, start_ts) WHERE duration IS NOT NULL;
CREATE INDEX clicks_label_session_id_timestamp_idx ON events.clicks (label, session_id, timestamp);
CREATE INDEX pages_base_path_session_id_timestamp_idx ON events.pages (base_path, session_id, timestamp);
CREATE INDEX ON public.assigned_sessions (session_id);
CREATE INDEX inputs_label_session_id_timestamp_idx ON events.inputs (label, session_id, timestamp);

ALTER TABLE events.clicks
    ADD COLUMN
        url text DEFAULT '' NOT NULL;
ALTER TABLE events.clicks
    ADD COLUMN
        selector text DEFAULT '' NOT NULL;

CREATE INDEX clicks_url_idx ON events.clicks (url);
CREATE INDEX clicks_url_gin_idx ON events.clicks USING GIN (url gin_trgm_ops);
CREATE INDEX clicks_url_session_id_timestamp_selector_idx ON events.clicks (url, session_id, timestamp, selector);


ALTER TABLE public.basic_authentication
    RENAME COLUMN token TO invitation_token;
ALTER TABLE public.basic_authentication
    RENAME COLUMN token_requested_at TO invited_at;
ALTER TABLE public.basic_authentication
    ADD COLUMN change_pwd_expire_at timestamp without time zone NULL DEFAULT NULL;
ALTER TABLE basic_authentication
    ADD COLUMN change_pwd_token text NULL DEFAULT NULL;
COMMIT;