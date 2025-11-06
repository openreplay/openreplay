FROM cgr.dev/chainguard/wolfi-base

# Install MinIO 2025 version (any patch within 2025)
RUN apk add --no-cache 'minio>=0.20250000' 'minio<0.20260000' openssl bash && \
  mkdir -p /bitnami/minio/data && \
  chown -R 1001:1001 /bitnami/minio/data

ENV MINIO_ROOT_USER=""
ENV MINIO_ROOT_PASSWORD=""
ENV MINIO_DATA_DIR="/bitnami/minio/data"

USER 1001

ENTRYPOINT [ "sh", "-c", "minio server \"${MINIO_DATA_DIR}\"" ]
