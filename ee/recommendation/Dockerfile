FROM python:3.10-slim-buster

WORKDIR app
COPY requirements_base.txt .

RUN apt-get update \
  && apt-get install gcc libc-dev g++ -y \
  && apt-get install -y pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl \
  && pip install -r requirements_base.txt \
  && apt-get clean

COPY core core
COPY utils utils

