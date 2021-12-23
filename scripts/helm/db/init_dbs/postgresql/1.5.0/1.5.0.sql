BEGIN;

CREATE INDEX user_favorite_sessions_user_id_session_id_idx ON user_favorite_sessions (user_id, session_id);

END;