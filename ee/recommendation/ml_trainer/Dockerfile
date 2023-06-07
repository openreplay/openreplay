FROM recommendations_base


RUN apt-get update \
  && apt-get install -y gcc libc-dev g++ pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl git\
  && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY airflow airflow
COPY entrypoint.sh .
COPY mlflow_server.sh .
COPY main.py .

EXPOSE 8080
EXPOSE 5000
ENTRYPOINT ./entrypoint.sh
