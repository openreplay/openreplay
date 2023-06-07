export MLFLOW_TRACKING_URI=postgresql+psycopg2://${pg_user_ml}:${pg_password_ml}@${pg_host_ml}:${pg_port_ml}/${pg_dbname_ml}
uvicorn api:app --host 0.0.0.0 --port 7001 --proxy-headers
