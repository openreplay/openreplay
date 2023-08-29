FROM python:3.11-alpine

COPY requirements.txt .
RUN pip install -r requirements.txt

WORKDIR api
COPY . /api

ENTRYPOINT ./entrypoint.sh
