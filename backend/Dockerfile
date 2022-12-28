FROM golang:1.18-alpine3.15 AS prepare

RUN apk add --no-cache git openssh openssl-dev pkgconf gcc g++ make libc-dev bash librdkafka-dev cyrus-sasl cyrus-sasl-gssapiv2 krb5

WORKDIR /root

COPY go.mod .
COPY go.sum .
RUN go mod download


FROM prepare AS build
COPY cmd cmd
COPY pkg pkg
COPY internal internal

ARG SERVICE_NAME
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o service -tags dynamic openreplay/backend/cmd/$SERVICE_NAME


FROM alpine AS entrypoint
ARG GIT_SHA
LABEL GIT_SHA=$GIT_SHA

RUN apk add --no-cache ca-certificates librdkafka-dev cyrus-sasl cyrus-sasl-gssapiv2 krb5
RUN adduser -u 1001 openreplay -D

ENV TZ=UTC \
    GIT_SHA=$GIT_SHA \
    FS_ULIMIT=1000 \
    FS_DIR=/mnt/efs \
    MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
    UAPARSER_FILE=/home/openreplay/regexes.yaml \
    HTTP_PORT=8080 \
    KAFKA_USE_SSL=true \
    # KAFKA_USE_KERBEROS should be set true if you wish to use Kerberos auth for Kafka
    KAFKA_USE_KERBEROS=false \
    # KERBEROS_SERVICE_NAME is the primary name of the Brokers configured in the Broker JAAS file
    KERBEROS_SERVICE_NAME="" \
    # KERBEROS_PRINCIPAL is this client's principal name
    KERBEROS_PRINCIPAL="" \
    # KERBEROS_PRINCIPAL is the absolute path to the keytab to be used for authentication
    KERBEROS_KEYTAB_LOCATION="" \
    # KAFKA_SSL_KEY is the absolute path to the CA cert for verifying the broker's key
    KAFKA_SSL_KEY="" \
    # KAFKA_SSL_CERT is a CA cert string (PEM format) for verifying the broker's key
    KAFKA_SSL_CERT="" \
    KAFKA_MAX_POLL_INTERVAL_MS=400000 \
    REDIS_STREAMS_MAX_LEN=10000 \
    TOPIC_RAW_WEB=raw \
    TOPIC_RAW_IOS=raw-ios \
    TOPIC_CACHE=cache \
    TOPIC_ANALYTICS=analytics \
    TOPIC_TRIGGER=trigger \
    GROUP_SINK=sink \
    GROUP_STORAGE=storage \
    GROUP_DB=db \
    GROUP_ENDER=ender \
    GROUP_CACHE=cache \
    GROUP_HEURISTICS=heuristics \
    AWS_REGION_WEB=eu-central-1 \
    AWS_REGION_IOS=eu-west-1 \
    AWS_REGION_ASSETS=eu-central-1 \
    AWS_SKIP_SSL_VALIDATION=false \
    CACHE_ASSETS=true \
    ASSETS_SIZE_LIMIT=6291456 \
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
    PROFILER_ENABLED=false



ARG SERVICE_NAME
RUN if [ "$SERVICE_NAME" = "http" ]; then \
  wget https://raw.githubusercontent.com/ua-parser/uap-core/master/regexes.yaml -O "$UAPARSER_FILE" &&\
  wget https://static.openreplay.com/geoip/GeoLite2-Country.mmdb -O "$MAXMINDDB_FILE"; fi


COPY --from=build /root/service /home/openreplay/service
USER 1001
ENTRYPOINT /home/openreplay/service
