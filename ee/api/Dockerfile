#FROM python:3.11-alpine
FROM python:3.11-slim
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
#RUN apk add --no-cache build-base libressl libffi-dev libressl-dev libxslt-dev libxml2-dev xmlsec-dev xmlsec tini
RUN apt-get update && apt-get install -y pkg-config libxmlsec1-dev gcc tini && rm -rf /var/lib/apt/lists/*

ARG envarg
ENV SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=chalice \
    LISTEN_PORT=8000 \
    PRIVATE_ENDPOINTS=false \
    ENTERPRISE_BUILD=${envarg}

WORKDIR /work
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
RUN mv env.default .env

#RUN adduser -u 1001 openreplay -D
RUN useradd -mu 1001 openreplay
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
