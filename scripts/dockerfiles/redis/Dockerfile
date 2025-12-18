FROM cgr.dev/chainguard/wolfi-base

# Install Redis 7.x (latest available major version in Wolfi)
RUN apk add --no-cache 'redis>=7' 'redis<8' redis-cli bash tini && \
  mkdir -p /data && \
  chown -R 1001:1001 /data

ENV REDIS_DATA_DIR="/data" \
  REDIS_REPLICATION_MODE="master" \
  ALLOW_EMPTY_PASSWORD="yes" \
  REDIS_TLS_ENABLED="no" \
  REDIS_PORT="6379"

COPY --chown=1001:1001 entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

USER 1001

WORKDIR /data

ENTRYPOINT ["tini", "--","/usr/local/bin/entrypoint.sh"]
