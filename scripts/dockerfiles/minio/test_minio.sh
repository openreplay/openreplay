#!/bin/bash

set -e

MINIO_HOST="localhost:9000"
ACCESS_KEY="minioadmin"
SECRET_KEY="minioadmin123"
BUCKET_NAME="test-bucket"

echo "Testing MinIO container..."
echo

# Check if MinIO is responding
echo "1. Checking MinIO health..."
if curl -s -f http://${MINIO_HOST}/minio/health/live > /dev/null 2>&1; then
    echo "✓ MinIO is running and healthy"
else
    echo "✗ MinIO health check failed"
    exit 1
fi

echo
echo "2. Container status:"
podman ps --filter name=minio-test --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo "3. Container logs (last 10 lines):"
podman logs --tail 10 minio-test

echo
echo "✅ MinIO container is running successfully!"
echo
echo "Access MinIO:"
echo "  API:     http://localhost:9000"
echo "  WebUI:   http://localhost:9001"
echo "  Username: minioadmin"
echo "  Password: minioadmin123"
echo
echo "To test object creation, you can:"
echo "  1. Open http://localhost:9001 in your browser"
echo "  2. Login with the credentials above"
echo "  3. Create a bucket and upload files through the web interface"
