#!/bin/bash

set -e


cd /tmp

buckets=("mobs" "sessions-assets" "static" "sourcemaps" "sessions-mobile-assets")

mc alias set minio http://minio.db.svc.cluster.local:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

function init() {
echo "Initializing minio"

cat <<EOF > /tmp/lifecycle.json
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

for bucket in ${buckets[*]}; do
mc mb minio/${bucket} || true
mc ilm import minio/${bucket} < /tmp/lifecycle.json || true
done

# Creating frontend bucket
mc mb minio/frontend || true
mc policy set download minio/frontend || true
mc policy set download minio/sessions-assets || true
mc policy set download minio/static || true
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
