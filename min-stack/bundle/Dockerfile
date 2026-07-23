# syntax=docker/dockerfile:1
#
# Single supervised bundle: all six core ingest workers under s6-overlay.
# Build context = repo root:
#   docker build -f min-stack/bundle/Dockerfile -t openreplay-min-bundle:local .

# Version-matched geoip + uaparser data from the published http worker image.
ARG HTTP_VERSION=v1.27.1
FROM public.ecr.aws/p1t3u8a3/http:${HTTP_VERSION} AS assets-src

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
    ca-certificates librdkafka-dev cyrus-sasl cyrus-sasl-gssapiv2 krb5 xz bash

# s6-overlay v3 (PID 1 init + process supervisor)
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz && rm -f /tmp/*.tar.xz

# Only what the image build itself needs; the full shared worker config lives in
# shared.env and is loaded per-service via the _shared s6 envdir at start, and
# per-worker secrets come from the individual envdirs.
ENV TZ=UTC \
    FS_DIR=/mnt/efs \
    MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
    UAPARSER_FILE=/home/openreplay/regexes.yaml \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

RUN mkdir -p "$FS_DIR" /home/openreplay
COPY --from=assets-src /home/openreplay/geoip.mmdb "$MAXMINDDB_FILE"
COPY --from=assets-src /home/openreplay/regexes.yaml "$UAPARSER_FILE"

WORKDIR /work
COPY --from=build /out ./bin
COPY min-stack/bundle/build-envdirs.sh ./build-envdirs.sh
COPY min-stack/bundle/shared.env ./shared.env
COPY min-stack/bundle/s6-rc.d /etc/s6-overlay/s6-rc.d
RUN chmod +x ./build-envdirs.sh ./bin/* /etc/s6-overlay/s6-rc.d/*/run 2>/dev/null || true

EXPOSE 8080
ENTRYPOINT ["/init"]
