FROM cgr.dev/chainguard/wolfi-base

# Install Redis 7.x (latest available major version in Wolfi)
RUN apk add --no-cache redis~7 redis-cli && \
  mkdir -p /data && \
  chown -R 1001:1001 /data

ENV REDIS_DATA_DIR="/data"

USER 1001

WORKDIR /data

ENTRYPOINT [ "sh", "-c" ,"redis-server --dir \"${REDIS_DATA_DIR}\" --protected-mode no"]
