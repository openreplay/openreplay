# Values setup
find airflow/ -type f -name "*.cfg" -exec sed -i "s/{{pg_user_airflow}}/${pg_user_airflow}/g" {} \;
find airflow/ -type f -name "*.cfg" -exec sed -i "s/{{pg_password_airflow}}/${pg_password_airflow}/g" {} \;
find airflow/ -type f -name "*.cfg" -exec sed -i "s/{{pg_host_airflow}}/${pg_host_airflow}/g" {} \;
find airflow/ -type f -name "*.cfg" -exec sed -i "s/{{pg_port_airflow}}/${pg_port_airflow}/g" {} \;
find airflow/ -type f -name "*.cfg" -exec sed -i "s/{{pg_dbname_airflow}}/${pg_dbname_airflow}/g" {} \;
find airflow/ -type f -name "*.cfg" -exec sed -i "s#{{airflow_secret_key}}#${airflow_secret_key}#g" {} \;
export MLFLOW_TRACKING_URI=postgresql+psycopg2://${pg_user_ml}:${pg_password_ml}@${pg_host_ml}:${pg_port_ml}/${pg_dbname_ml}
git init airflow/dags
# Airflow setup
# airflow db init
# airflow users create \
#  --username admin \
#  --firstname admin \
#  --lastname admin \
#  --role Admin \
#  --email admin@admin.admin \
#  -p ${airflow_admin_password}
# Run services
airflow webserver --port 8080 & airflow scheduler & ./mlflow_server.sh
