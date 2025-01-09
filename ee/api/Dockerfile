FROM python:3.12-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache build-base libressl libffi-dev libressl-dev libxslt-dev libxml2-dev xmlsec-dev xmlsec tini

ARG envarg
ENV SOURCE_MAP_VERSION=0.7.4 \
  APP_NAME=chalice \
  LISTEN_PORT=8000 \
  PRIVATE_ENDPOINTS=false \
  ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=$GIT_SHA

WORKDIR /work
COPY requirements.txt ./requirements.txt
# Caching the source build
#RUN pip install --no-cache-dir --upgrade uv
#RUN uv pip install --no-cache-dir --upgrade pip setuptools wheel --system
#RUN uv pip install --no-cache-dir --upgrade python3-saml==1.16.0 --no-binary=lxml --system
#RUN uv pip install --no-cache-dir --upgrade -r requirements.txt --system
RUN pip install --no-cache-dir --upgrade -r requirements.txt --system

COPY . .
RUN mv env.default .env

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
