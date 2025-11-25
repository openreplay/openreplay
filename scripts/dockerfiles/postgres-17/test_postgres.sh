#!/bin/bash

set -e

POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres123"
POSTGRES_DB="postgres"
CONTAINER_NAME="postgres-test"

echo "Testing PostgreSQL container..."
echo

# Check if container is running
echo "1. Checking container status..."
if podman ps --filter name=${CONTAINER_NAME} --format "{{.Names}}" | grep -q ${CONTAINER_NAME}; then
    echo "✓ PostgreSQL container is running"
else
    echo "✗ PostgreSQL container is not running"
    exit 1
fi

echo
echo "2. Container status:"
podman ps --filter name=${CONTAINER_NAME} --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo "3. Testing PostgreSQL connection..."
sleep 5  # Wait for PostgreSQL to be ready

if podman exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER} -h 127.0.0.1 -p ${POSTGRES_PORT} >/dev/null 2>&1; then
    echo "✓ PostgreSQL is accepting connections"
else
    echo "✗ PostgreSQL is not ready"
    exit 1
fi

echo
echo "4. Checking PostgreSQL version..."
podman exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "SELECT version();"

echo
echo "5. Checking loaded extensions..."
podman exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "SHOW shared_preload_libraries;"

echo
echo "6. Container logs (last 10 lines):"
podman logs --tail 10 ${CONTAINER_NAME}

echo
echo "✅ PostgreSQL container is running successfully!"
echo
echo "Connection details:"
echo "  Host:     ${POSTGRES_HOST}"
echo "  Port:     ${POSTGRES_PORT}"
echo "  User:     ${POSTGRES_USER}"
echo "  Password: ${POSTGRES_PASSWORD}"
echo "  Database: ${POSTGRES_DB}"
echo
echo "To connect:"
echo "  podman exec -it ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
