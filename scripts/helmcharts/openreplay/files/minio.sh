#!/bin/bash

set -e


cd /tmp

buckets=("mobs" "sessions-assets" "static" "sourcemaps")

mc alias set minio http://minio.db.svc.cluster.local:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

function init() {
echo "Initializing minio"

for bucket in ${buckets[*]}; do
mc mb minio/${bucket} || true
mc ilm import minio/${bucket} <<EOF
{
    "Rules": [
        {
            "Expiration": {
                "Days": 180
            },
            "ID": "${bucket}",
            "Status": "Enabled"
        }
    ]
}
EOF
done

# Creating frontend bucket
mc mb minio/frontend || true
mc policy set download minio/frontend
mc policy set download minio/sessions-assets
mc policy set download minio/static

curl -L https://github.com/openreplay/openreplay/releases/download/${CHART_APP_VERSION}/frontend.tar.gz -O
tar -xf frontend.tar.gz
mc cp --recursive frontend/ minio/frontend/
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
        echo "Unknown operation for minio migration; exiting."
        exit 1
        ;;
esac

