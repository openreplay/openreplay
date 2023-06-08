DO
$do$
BEGIN
   IF EXISTS (SELECT FROM pg_database WHERE datname = 'mlruns') THEN
      RAISE NOTICE 'Database already exists';  -- optional
   ELSE
      PERFORM dblink_exec('dbname=' || current_database()  -- current db
                        , 'CREATE DATABASE mlruns');
   END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS mlruns.public.recommendation_feedback
(
    user_id        BIGINT,
    session_id     BIGINT,
    project_id     BIGINT,
    payload        jsonb,
    insertion_time BIGINT
);
