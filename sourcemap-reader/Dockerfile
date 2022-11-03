FROM node:18-alpine
LABEL Maintainer="KRAIEM Taha Yassine<tahayk2@gmail.com>"
RUN apk add --no-cache tini

ARG envarg
ENV SOURCE_MAP_VERSION=0.7.4 \
    APP_NAME=sourcemaps-reader \
    LISTEN_PORT=9000 \
    MAPPING_WASM=/work/mappings.wasm \
    PRIVATE_ENDPOINTS=true \
    ENTERPRISE_BUILD=${envarg}

ADD https://unpkg.com/source-map@${SOURCE_MAP_VERSION}/lib/mappings.wasm ${MAPPING_WASM}
WORKDIR /work
COPY *.json ./
RUN npm install && chmod 644 ${MAPPING_WASM}

COPY . .

RUN adduser -u 1001 openreplay -D
USER 1001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ./entrypoint.sh
