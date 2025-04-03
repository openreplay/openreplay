FROM python:3.12-alpine
LABEL maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
WORKDIR /app

COPY . .
RUN mv env.default .env
RUN apk add --no-cache tini xmlsec && \
  export UV_SYSTEM_PYTHON=true && \
  pip install uv && \
  apk add --no-cache --virtual .build-deps \
  build-base \
  libressl \
  libffi-dev \
  libressl-dev \
  libxslt-dev \
  libxml2-dev \
  xmlsec-dev && \
  uv pip install --no-cache-dir --upgrade -r requirements.txt && \
  # Solve the libxml2 library version mismatch by reinstalling lxml with matching libxml2
  uv pip uninstall lxml && \
  uv pip install --no-cache-dir --no-binary lxml lxml --force-reinstall && \
  # Create non-root user
  adduser -u 1001 openreplay -D && \
  # Cleanup build dependencies
  apk del .build-deps

ARG envarg
ARG GIT_SHA
ENV SOURCE_MAP_VERSION=0.7.4 \
  APP_NAME=chalice \
  LISTEN_PORT=8000 \
  PRIVATE_ENDPOINTS=false \
  ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=$GIT_SHA

WORKDIR /app

COPY . .
RUN mv env.default .env

USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./entrypoint.sh"]
