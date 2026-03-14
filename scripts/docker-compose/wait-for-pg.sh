#!/bin/sh
# Wait for PostgreSQL to be reachable before starting the service.
# Handles both initial startup and restart-after-crash scenarios.

PG_HOST="${PG_HOST:-postgresql.db.svc.cluster.local}"
PG_PORT="${PG_PORT:-5432}"
MAX_WAIT=60
WAITED=0

echo "Waiting for PostgreSQL at ${PG_HOST}:${PG_PORT}..."
until nc -z -w3 "$PG_HOST" "$PG_PORT" 2>/dev/null; do
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "ERROR: PostgreSQL not reachable after ${MAX_WAIT}s, starting anyway"
        break
    fi
    echo "PostgreSQL not ready, retrying in 2s... (${WAITED}/${MAX_WAIT}s)"
    sleep 2
done

if [ $WAITED -lt $MAX_WAIT ]; then
    echo "PostgreSQL is ready (waited ${WAITED}s), starting service"
    # Brief pause to let PG fully accept connections (not just TCP)
    sleep 2
fi

exec /home/openreplay/service
