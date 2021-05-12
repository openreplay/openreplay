#!/bin/bash
buckets=("asayer-mobs" "asayer-sessions-assets" "static")

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
mc policy set download minio/asayer-sessions-assets
mc policy set download minio/static
