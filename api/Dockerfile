FROM python:3.10-alpine
LABEL Maintainer="Rajesh Rajendran<rjshrjndrn@gmail.com>"
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache build-base nodejs npm tini
ARG envarg
# Add Tini
# Startup daemon
ENV SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=chalice \
    LISTEN_PORT=8000 \
    MAPPING_WASM=/work/sourcemap-reader/mappings.wasm \
    ENTERPRISE_BUILD=${envarg}

ADD https://unpkg.com/source-map@${SOURCE_MAP_VERSION}/lib/mappings.wasm /mappings.wasm

WORKDIR /work_tmp
COPY requirements.txt /work_tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /work_tmp/requirements.txt
COPY sourcemap-reader/*.json /work_tmp/
RUN cd /work_tmp && npm install

WORKDIR /work
COPY . .
RUN mv env.default .env && mv /work_tmp/node_modules sourcemap-reader/. \
    && mv /mappings.wasm ${MAPPING_WASM} && chmod 644 ${MAPPING_WASM}

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
