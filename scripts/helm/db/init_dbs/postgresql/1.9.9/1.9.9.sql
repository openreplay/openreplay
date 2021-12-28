BEGIN;

CREATE INDEX IF NOT EXISTS user_favorite_sessions_user_id_session_id_idx ON user_favorite_sessions (user_id, session_id);

CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);

CREATE INDEX ON events.errors (timestamp);
CREATE INDEX ON public.projects (project_key);

ALTER TABLE sessions
    ADD COLUMN utm_source   text NULL DEFAULT NULL,
    ADD COLUMN utm_medium   text NULL DEFAULT NULL,
    ADD COLUMN utm_campaign text NULL DEFAULT NULL;

CREATE INDEX sessions_utm_source_gin_idx ON public.sessions USING GIN (utm_source gin_trgm_ops);
CREATE INDEX sessions_utm_medium_gin_idx ON public.sessions USING GIN (utm_medium gin_trgm_ops);
CREATE INDEX sessions_utm_campaign_gin_idx ON public.sessions USING GIN (utm_campaign gin_trgm_ops);

COMMIT;