FROM python:3.10-slim-buster

RUN apt-get update \
  && apt-get install -y gcc libc-dev g++ pkg-config libxml2-dev libxmlsec1-dev libxmlsec1-openssl \
  && apt-get clean

WORKDIR app
COPY requirements_base.txt .

RUN pip install --no-cache-dir -r requirements_base.txt

COPY core core
COPY utils utils

