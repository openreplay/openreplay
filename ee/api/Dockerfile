FROM python:3.11-alpine3.17
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache build-base libressl libffi-dev libressl-dev libxslt-dev libxml2-dev xmlsec-dev xmlsec tini

ARG envarg
ENV SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=chalice \
    LISTEN_PORT=8000 \
    PRIVATE_ENDPOINTS=false \
    ENTERPRISE_BUILD=${envarg}

WORKDIR /work
COPY requirements.txt ./requirements.txt
# Caching the source build
RUN pip install --no-cache-dir --upgrade python3-saml==1.16.0 --no-binary=lxml
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
RUN mv env.default .env

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
