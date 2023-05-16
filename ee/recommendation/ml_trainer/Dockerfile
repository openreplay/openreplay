FROM recommendations_base

COPY requirements.txt .
RUN apt-get update \
  && apt-get install gcc libc-dev g++ -y \
  && apt-get install -y pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl \
  && pip install -r requirements.txt \
  && apt-get clean
RUN apt-get install git -y

COPY airflow airflow

COPY entrypoint.sh .
COPY mlflow_server.sh .
COPY main.py .

EXPOSE 8080
EXPOSE 5000
ENTRYPOINT ./entrypoint.sh
