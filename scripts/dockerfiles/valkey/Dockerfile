FROM cgr.dev/chainguard/wolfi-base

# Install Valkey 8.x, tini and bash
RUN apk add --no-cache 'valkey>=8' 'valkey<9' valkey-cli tini bash && \
  mkdir -p /data && \
  chown -R 1001:1001 /data

# Bitnami-compatible environment variables (keep REDIS_ prefix for backward compatibility)
ENV REDIS_DATA_DIR="/data" \
  REDIS_REPLICATION_MODE="master" \
  ALLOW_EMPTY_PASSWORD="yes" \
  REDIS_TLS_ENABLED="no" \
  REDIS_PORT="6379"

COPY --chown=1001:1001 entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

USER 1001

WORKDIR /data

ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/entrypoint.sh"]
