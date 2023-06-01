FROM python:3.11-alpine
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA

RUN apk add --no-cache build-base tini
ARG envarg
# Add Tini
# Startup daemon
ENV SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=chalice \
    LISTEN_PORT=8000 \
    PRIVATE_ENDPOINTS=false \
    ENTERPRISE_BUILD=${envarg} \
    GIT_SHA=$GIT_SHA

WORKDIR /work
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .
RUN mv env.default .env

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh

