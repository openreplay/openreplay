FROM cgr.dev/chainguard/wolfi-base

# Install Valkey 8.x, tini and bash
RUN apk add --no-cache valkey-8.1 valkey-8.1-cli tini bash && \
  mkdir -p /data && \
  chown -R nonroot:nonroot /data

# Bitnami-compatible environment variables (keep REDIS_ prefix for backward compatibility)
ENV REDIS_DATA_DIR="/data" \
  REDIS_REPLICATION_MODE="master" \
  ALLOW_EMPTY_PASSWORD="yes" \
  REDIS_TLS_ENABLED="no" \
  REDIS_PORT="6379"

COPY --chown=nonroot:nonroot entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

USER nonroot

WORKDIR /data

ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/entrypoint.sh"]
