FROM cgr.dev/chainguard/minio-client:latest AS minio-client

FROM cgr.dev/chainguard/wolfi-base

# Install MinIO 2025 version (any patch within 2025)
RUN apk add --no-cache 'minio>=0.20250000' 'minio<0.20260000' openssl bash tini && \
  mkdir -p /bitnami/minio/data /home/nonroot && \
  chown -R 1001:1001 /bitnami/minio/data /home/nonroot

# Copy mc binary from minio-client image
COPY --from=minio-client /usr/bin/mc /usr/bin/mc

ENV HOME=/home/nonroot
ENV MINIO_ROOT_USER=""
ENV MINIO_ROOT_PASSWORD=""

USER 1001

ENTRYPOINT ["/sbin/tini", "--", "minio", "server", "/bitnami/minio/data"]
