#!/bin/bash

set -e

# Default to 4 days.
RETENTION_TIME=${RETENTION_TIME:-345600000}

topics=(
  "raw"
  "raw-ios"
  "trigger"
  "cache"
  "analytics"
  "storage-failover"
  "quickwit"
)

touch /tmp/config.txt

if [[ $KAFKA_SSL == "true" ]]; then
  echo 'security.protocol=SSL' > /tmp/config.txt
fi

function init() {
  echo "Initializing kafka"
  for topic in ${topics[*]}; do
    echo "Creating topic: $topic"
    # TODO: Have to check an idempotent way of creating topics.
    kafka-topics.sh --create --bootstrap-server ${KAFKA_HOST}:${KAFKA_PORT} --replication-factor 2 --partitions 16 --topic ${topic} --command-config /tmp/config.txt || true
    kafka-configs.sh --bootstrap-server ${KAFKA_HOST}:${KAFKA_PORT} --entity-type topics --alter --add-config retention.ms=${RETENTION_TIME} --entity-name=${topic} --command-config /tmp/config.txt || true
  done
}

# /bin/bash kafka.sh migrate $migration_versions
case "$1" in
  migrate)
    init
    ;;
  init)
    init
    ;;
  *)
    echo "Unknown operation for kafka migration; exiting."
    exit 1
    ;;
esac
