DO
$do$
BEGIN
   IF EXISTS (SELECT FROM pg_database WHERE datname = 'airflow') THEN
      RAISE NOTICE 'Database already exists';  -- optional
   ELSE
      PERFORM dblink_exec('dbname=' || current_database()  -- current db
                        , 'CREATE DATABASE airflow');
   END IF;
END
$do$;
