#!/bin/bash
buckets=("mobs" "sessions-assets" "static" "sourcemaps" "sessions-mobile-assets")

mc alias set minio http://localhost:9000 $1 $2

for bucket in ${buckets[*]}; do
mc mb minio/${bucket}
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
mc mb minio/frontend
mc policy set download minio/frontend
mc policy set download minio/sessions-assets
mc policy set download minio/static
