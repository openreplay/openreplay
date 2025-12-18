FROM cgr.dev/chainguard/wolfi-base

RUN apk add --no-cache kafka~3 openssl bash tini && \
  mkdir -p /bitnami/kafka /usr/lib/kafka/logs && \
  chown -R 1001:1001 /bitnami/kafka /usr/lib/kafka/logs

COPY start-kafka.sh /usr/local/bin/start-kafka.sh
RUN chmod +x /usr/local/bin/start-kafka.sh && \
  chown 1001:1001 /usr/local/bin/start-kafka.sh

USER 1001

ENV LOG_DIR=/bitnami/kafka/logs \
    PATH=/usr/lib/kafka/bin:$PATH

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/start-kafka.sh"]
CMD ["/usr/lib/kafka/config/kraft/server.properties"]
