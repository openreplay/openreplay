FROM python:3.10
WORKDIR service
COPY tmp/ch_client.py utils/
COPY tmp/pg_client.py utils/
COPY recommendation.py .
COPY requirements.txt .
RUN apt update
RUN apt-get install libxml2-dev libxmlsec1-dev libxmlsec1-openssl -y
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN touch utils/__init__.py
ENV pg_host=postgresql.db.svc.cluster.local \
    pg_port=5432 \
    pg_user='postgres' \
    pg_password='8ea158c722fab5976023' \
    pg_dbname='postgres' \
    PG_TIMEOUT=30 \
    ch_host=clickhouse-openreplay-clickhouse.db.svc.cluster.local \
    ch_port=9000 \
    ch_timeout=30 \
    ch_receive_timeout=40
EXPOSE 8080
RUN airflow db init
CMD airflow webserver --host 0.0.0.0 --port 8080
