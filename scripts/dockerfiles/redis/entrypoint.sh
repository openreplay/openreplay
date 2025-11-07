#!/bin/sh
set -e

# Build Redis command with arguments
REDIS_ARGS="--dir ${REDIS_DATA_DIR}"

# Set port
REDIS_ARGS="${REDIS_ARGS} --port ${REDIS_PORT}"

# Handle replication mode
if [ "${REDIS_REPLICATION_MODE}" = "slave" ] || [ "${REDIS_REPLICATION_MODE}" = "replica" ]; then
    if [ -n "${REDIS_MASTER_HOST}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --replicaof ${REDIS_MASTER_HOST} ${REDIS_MASTER_PORT:-6379}"
    fi
fi

# Handle password (requirepass)
if [ "${ALLOW_EMPTY_PASSWORD}" != "yes" ]; then
    if [ -n "${REDIS_PASSWORD}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --requirepass ${REDIS_PASSWORD}"
    else
        echo "ERROR: ALLOW_EMPTY_PASSWORD is not 'yes' but REDIS_PASSWORD is not set"
        exit 1
    fi
else
    REDIS_ARGS="${REDIS_ARGS} --protected-mode no"
fi

# Handle TLS
if [ "${REDIS_TLS_ENABLED}" = "yes" ]; then
    if [ -n "${REDIS_TLS_PORT}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --tls-port ${REDIS_TLS_PORT}"
    fi
    if [ -n "${REDIS_TLS_CERT_FILE}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --tls-cert-file ${REDIS_TLS_CERT_FILE}"
    fi
    if [ -n "${REDIS_TLS_KEY_FILE}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --tls-key-file ${REDIS_TLS_KEY_FILE}"
    fi
    if [ -n "${REDIS_TLS_CA_FILE}" ]; then
        REDIS_ARGS="${REDIS_ARGS} --tls-ca-cert-file ${REDIS_TLS_CA_FILE}"
    fi
fi

echo "Starting Redis with: redis-server ${REDIS_ARGS}"
exec redis-server ${REDIS_ARGS}
