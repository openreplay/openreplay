# syntax=docker/dockerfile:1
#
# Single supervised bundle: the six core workers built FROM SOURCE (this repo's
# HEAD) and run under s6-overlay in one container. Build recipe mirrors
# backend/Dockerfile (go 1.26, -tags dynamic, same baked worker ENV); the six
# binaries are then supervised by s6 instead of one per container.
#
#   docker build -f min-stack/bundle/Dockerfile -t openreplay-min-bundle:local .

FROM golang:1.26-alpine AS build
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
    git openssh openssl-dev pkgconf gcc g++ make libc-dev bash \
    librdkafka-dev cyrus-sasl cyrus-sasl-gssapiv2 krb5
WORKDIR /root
COPY backend/go.mod backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY backend/cmd cmd
COPY backend/pkg pkg
COPY backend/internal internal
ARG ARCH=amd64
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    for name in http ender sink storage db assets; do \
      echo "building $name" && \
      CGO_ENABLED=1 GOOS=linux GOARCH=$ARCH go build -o /out/$name -tags dynamic \
        openreplay/backend/cmd/$name; \
    done

FROM alpine AS bundle
ARG S6_OVERLAY_VERSION=3.2.3.2
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
    ca-certificates librdkafka-dev cyrus-sasl cyrus-sasl-gssapiv2 krb5 xz wget bash zstd

# s6-overlay v3 (PID 1 init + process supervisor)
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz && rm -f /tmp/*.tar.xz

# Container-wide worker config, mirroring backend/Dockerfile's baked ENV. Loaded
# by every service via `with-contenv`; per-worker envdirs (secrets, connection
# strings, BUCKET_NAME) are applied AFTER and therefore win.
ENV TZ=UTC \
    FS_ULIMIT=10000 \
    FS_DIR=/mnt/efs \
    MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
    UAPARSER_FILE=/home/openreplay/regexes.yaml \
    HTTP_PORT=8080 \
    KAFKA_USE_SSL=false \
    KAFKA_USE_KERBEROS=false \
    KAFKA_MAX_POLL_INTERVAL_MS=400000 \
    REDIS_STREAMS_MAX_LEN=10000 \
    TOPIC_RAW_WEB=raw \
    TOPIC_RAW_IOS=raw-ios \
    TOPIC_RAW_IMAGES=raw-images \
    TOPIC_CACHE=cache \
    TOPIC_ANALYTICS=analytics \
    TOPIC_TRIGGER=trigger \
    TOPIC_MOBILE_TRIGGER=mobile-trigger \
    TOPIC_CANVAS_IMAGES=canvas-images \
    TOPIC_CANVAS_TRIGGER=canvas-trigger \
    TOPIC_RAW_ANALYTICS=raw-analytics \
    TOPIC_RAW_ASSETS=raw-assets \
    GROUP_SINK=sink \
    GROUP_STORAGE=storage \
    GROUP_DB=db \
    GROUP_ENDER=ender \
    GROUP_CACHE=cache \
    GROUP_HEURISTICS=heuristics \
    GROUP_IMAGE_STORAGE=image-storage \
    GROUP_CANVAS_IMAGE=canvas-image \
    GROUP_CANVAS_VIDEO=canvas-video \
    GROUP_ANALYTICS=analytics \
    GROUP_CLEANUP=cleaner \
    AWS_REGION_WEB=eu-central-1 \
    AWS_REGION_IOS=eu-west-1 \
    AWS_REGION_ASSETS=eu-central-1 \
    AWS_SKIP_SSL_VALIDATION=false \
    CACHE_ASSETS=true \
    ASSETS_SIZE_LIMIT=60291456 \
    ASSETS_HEADERS="{ \"Cookie\": \"ABv=3;\" }" \
    FS_CLEAN_HRS=72 \
    FILE_SPLIT_SIZE=1000000 \
    LOG_QUEUE_STATS_INTERVAL_SEC=60 \
    DB_BATCH_QUEUE_LIMIT=20 \
    DB_BATCH_SIZE_LIMIT=10000000 \
    PARTITIONS_NUMBER=16 \
    QUEUE_MESSAGE_SIZE_LIMIT=1048576 \
    BEACON_SIZE_LIMIT=1000000 \
    USE_FAILOVER=false \
    GROUP_STORAGE_FAILOVER=failover \
    TOPIC_STORAGE_FAILOVER=storage-failover \
    PROFILER_ENABLED=false \
    COMPRESSION_TYPE=zstd \
    CH_USERNAME="default" \
    CH_PASSWORD="" \
    CH_DATABASE="default" \
    MAX_FILE_SIZE=100000000 \
    USE_ENCRYPTION=false \
    CLOUD="aws" \
    COMPRESSION_THRESHOLD="20000" \
    USE_CORS=false \
    RECORD_CANVAS=true \
    IS_FEATURE_FLAG_ENABLED=false \
    IS_USABILITY_TEST_ENABLED=false \
    REDIS_STREAMS_TTL_SEC=0 \
    KAFKA_DELIVERY_REPORTS=true \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

RUN adduser -u 1001 openreplay -D && mkdir -p "$FS_DIR" /home/openreplay
# geoip + uaparser data (same sources as backend/Dockerfile's http stage).
RUN wget -q https://raw.githubusercontent.com/ua-parser/uap-core/master/regexes.yaml -O "$UAPARSER_FILE" && \
    wget -q https://static.openreplay.com/geoip/dbip-city-lite.mmdb -O "$MAXMINDDB_FILE"

WORKDIR /work
COPY --from=build /out ./bin
COPY min-stack/bundle/build-envdirs.sh ./build-envdirs.sh
COPY min-stack/bundle/s6-rc.d /etc/s6-overlay/s6-rc.d
RUN chmod +x ./build-envdirs.sh ./bin/* /etc/s6-overlay/s6-rc.d/*/run 2>/dev/null || true

EXPOSE 8080
ENTRYPOINT ["/init"]
