FROM python:3.10-slim-buster
WORKDIR app
RUN mkdir airflow
COPY airflow airflow
COPY core core
COPY utils utils
COPY requirements.txt .
COPY entrypoint.sh .
COPY mlflow_server.sh .
COPY main.py .

RUN apt-get update \
  && apt-get install gcc libc-dev g++ -y \
  && apt-get install -y pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl
RUN apt-get clean

ENV ch_host='host.docker.internal' \
    ch_port='8123' \
    pg_host='host.docker.internal' \
    pg_port='9201' \
    pg_user='app' \
    pg_password='' \
    pg_dbname='postgres' \
    pg_host_ml='scripts-db-1.scripts_bridge' \
    pg_port_ml='5432' \
    pg_user_ml='postgres' \
    pg_password_ml='postgres' \
    pg_dbname_ml='mlruns' \
    MODELS_S3_BUCKET='s3://openreplay-ml/recommendations/' \
#    MLFLOW_TRACKING_URI='' \
#    AIRFLOW__DATABASE__SQL_ALCHEMY_CONN='' \
#    AIRFLOW__CORE__SQL_ALCHEMY_CONN='' \
#    AIRFLOW__CELERY__RESULT_BACKEND='' \
    pg_user_airflow='postgres' \
    pg_password_airflow='postgres' \
    pg_dbname_airflow='airflow' \
    pg_host_airflow='scripts-db-1.scripts_bridge' \
    pg_port_airflow='5432' \
    AIRFLOW_HOME=/app/airflow \
    airflow_admin_password='admin' \
    crons_train='0 */2 * * *'

RUN pip install -r requirements.txt
COPY env.default .env
RUN export $(grep -v '^#' .env | xargs -0)
EXPOSE 8080
EXPOSE 5000
ENTRYPOINT ./entrypoint.sh
