FROM apache/airflow:2.4.3
COPY requirements.txt .

USER root
RUN apt-get update \
  && apt-get install -y \
         vim \
  && apt-get install gcc libc-dev g++ -y \
  && apt-get install -y pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl


USER airflow
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
