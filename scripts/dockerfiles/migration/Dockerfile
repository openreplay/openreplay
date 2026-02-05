FROM cgr.dev/chainguard/wolfi-base

WORKDIR /work
RUN apk add --no-cache bash git shadow netcat-openbsd && chsh -s /bin/bash

# Context must be repo root, build with: docker build -f scripts/dockerfiles/toolkit/Dockerfile .
COPY scripts/schema /work/scripts/schema
COPY ee/scripts/schema /work/ee/scripts/schema
# Create helmcharts marker directory (job.yaml checks for its existence)
RUN mkdir -p /work/scripts/helmcharts

USER 0
