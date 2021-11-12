FROM golang:1.13-alpine3.10 AS prepare

RUN apk add --no-cache git openssh openssl-dev pkgconf gcc g++ make libc-dev bash

WORKDIR /root

COPY go.mod .
COPY go.sum .
RUN go mod download


FROM prepare AS build
COPY pkg pkg
COPY services services

ARG SERVICE_NAME
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o service -tags musl openreplay/backend/services/$SERVICE_NAME

FROM alpine
RUN apk add --no-cache ca-certificates

ENV TZ=UTC \
    FS_ULIMIT=1000 \
    FS_DIR=/mnt/efs \
    MAXMINDDB_FILE=/root/geoip.mmdb \
    UAPARSER_FILE=/root/regexes.yaml \
    HTTP_PORT=80 \
    BEACON_SIZE_LIMIT=7000000 \
    KAFKA_USE_SSL=true \
    REDIS_STREAMS_MAX_LEN=3000 \
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
    AWS_REGION_WEB=eu-central-1 \
    AWS_REGION_IOS=eu-west-1 \
    AWS_REGION_ASSETS=eu-central-1 \
    CACHE_ASSETS=true \
    ASSETS_SIZE_LIMIT=6291456 \
    FS_CLEAN_HRS=72


ARG SERVICE_NAME
RUN if [ "$SERVICE_NAME" = "http" ]; then \
  wget https://raw.githubusercontent.com/ua-parser/uap-core/master/regexes.yaml -O "$UAPARSER_FILE" &&\
  wget https://static.openreplay.com/geoip/GeoLite2-Country.mmdb -O "$MAXMINDDB_FILE"; fi


COPY --from=build /root/service /root/service
ENTRYPOINT /root/service
