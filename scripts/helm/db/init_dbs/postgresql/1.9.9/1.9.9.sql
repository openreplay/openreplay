BEGIN;

CREATE INDEX IF NOT EXISTS user_favorite_sessions_user_id_session_id_idx ON user_favorite_sessions (user_id, session_id);

CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);

CREATE INDEX ON events.errors (timestamp);
CREATE INDEX ON public.projects (project_key);
END;