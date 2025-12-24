FROM python:3.14-alpine AS builder
LABEL maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"

RUN apk add --no-cache build-base
WORKDIR /work
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade uv && \
  export UV_SYSTEM_PYTHON=true && \
  uv pip install --no-cache-dir --upgrade pip setuptools wheel && \
  uv pip install --no-cache-dir --upgrade -r requirements.txt

FROM python:3.14-alpine
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
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
WORKDIR /work
COPY . .
RUN apk add --no-cache tini && mv env.default .env

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./entrypoint.sh"]
