FROM python:3.12-alpine
LABEL maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"

RUN apk add --no-cache build-base=~1.2 tini=~0.19
ARG GIT_SHA
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
RUN pip install --no-cache-dir --upgrade uv && \
  uv pip install --no-cache-dir --upgrade pip setuptools wheel --system && \
  uv pip install --no-cache-dir --upgrade -r requirements.txt --system

COPY . .
RUN mv env.default .env && \
  adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./entrypoint.sh"]

