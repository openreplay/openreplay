# syntax=docker/dockerfile:1
#
# Single supervised bundle: the six published core-worker binaries repackaged
# to run under s6-overlay in one container. We repackage the SAME release
# binaries the multi-container minimal stack uses (not a from-source build) so
# the ingest protocol stays in lockstep with the released tracker.
#
#   docker build -f min-stack/bundle/Dockerfile -t openreplay-min-bundle:local .

ARG HTTP_VERSION=v1.27.1
ARG ENDER_VERSION=v1.27.4
ARG SINK_VERSION=v1.27.2
ARG STORAGE_VERSION=v1.27.0
ARG DB_VERSION=v1.27.3
ARG ASSETS_VERSION=v1.27.2
ARG REGISTRY=public.ecr.aws/p1t3u8a3

# Worker binary lives at /home/openreplay/service in each published image.
FROM ${REGISTRY}/ender:${ENDER_VERSION}     AS ender-src
FROM ${REGISTRY}/sink:${SINK_VERSION}       AS sink-src
FROM ${REGISTRY}/storage:${STORAGE_VERSION} AS storage-src
FROM ${REGISTRY}/db:${DB_VERSION}           AS db-src
FROM ${REGISTRY}/assets:${ASSETS_VERSION}   AS assets-src

# Base on the http image: it already carries the alpine runtime deps
# (librdkafka, sasl, ca-certs) plus the geoip and uaparser data files.
FROM ${REGISTRY}/http:${HTTP_VERSION} AS bundle
USER root

ARG S6_OVERLAY_VERSION=3.2.3.2
RUN apk add --no-cache xz bash
# sink/storage require the local staging dir to already exist.
RUN mkdir -p /mnt/efs

# s6-overlay v3 (PID 1 init + process supervisor). Replaces the image's own
# single-binary entrypoint.
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz && rm -f /tmp/*.tar.xz

# Gather all six worker binaries into /work/bin.
WORKDIR /work
RUN mkdir -p bin && cp /home/openreplay/service bin/http
COPY --from=ender-src   /home/openreplay/service bin/ender
COPY --from=sink-src    /home/openreplay/service bin/sink
COPY --from=storage-src /home/openreplay/service bin/storage
COPY --from=db-src      /home/openreplay/service bin/db
COPY --from=assets-src  /home/openreplay/service bin/assets

# Per-service env + supervision tree.
COPY min-stack/bundle/build-envdirs.sh ./build-envdirs.sh
COPY min-stack/bundle/shared.env ./shared.env
COPY min-stack/bundle/s6-rc.d /etc/s6-overlay/s6-rc.d
RUN chmod +x ./build-envdirs.sh ./bin/* /etc/s6-overlay/s6-rc.d/*/run 2>/dev/null || true

ENV S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0

EXPOSE 8080
ENTRYPOINT ["/init"]
