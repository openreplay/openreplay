FROM python:3.10-slim-buster
WORKDIR app
COPY core core
COPY utils utils
COPY requirements.txt .
COPY main.py .
COPY entrypoint.sh .
COPY api.py .

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
    pg_dbname_ml='mlruns'

RUN pip install -r requirements.txt
EXPOSE 7001
ENTRYPOINT ./entrypoint.sh
