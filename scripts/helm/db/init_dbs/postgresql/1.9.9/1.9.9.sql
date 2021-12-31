BEGIN;

CREATE INDEX IF NOT EXISTS user_favorite_sessions_user_id_session_id_idx ON user_favorite_sessions (user_id, session_id);

CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);

CREATE INDEX ON events.errors (timestamp);
CREATE INDEX ON public.projects (project_key);

ALTER TABLE sessions
    ADD COLUMN utm_source   text NULL DEFAULT NULL,
    ADD COLUMN utm_medium   text NULL DEFAULT NULL,
    ADD COLUMN utm_campaign text NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS sessions_utm_source_gin_idx ON public.sessions USING GIN (utm_source gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sessions_utm_medium_gin_idx ON public.sessions USING GIN (utm_medium gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sessions_utm_campaign_gin_idx ON public.sessions USING GIN (utm_campaign gin_trgm_ops);
CREATE INDEX IF NOT EXISTS requests_timestamp_session_id_failed_idx ON events_common.requests (timestamp, session_id) WHERE success = FALSE;


DROP INDEX IF EXISTS sessions_project_id_user_browser_idx1;
DROP INDEX IF EXISTS sessions_project_id_user_country_idx1;
ALTER INDEX IF EXISTS platform_idx RENAME TO sessions_platform_idx;
ALTER INDEX IF EXISTS events.resources_duration_idx RENAME TO resources_duration_durationgt0_idx;
DROP INDEX IF EXISTS projects_project_key_idx1;
COMMIT;