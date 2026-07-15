#!/bin/bash

set -e

cd /tmp

buckets=("mobs" "sessions-assets" "static" "sourcemaps" "sessions-mobile-assets" "quickwit" "vault-data" "records" "spots")

mc alias set minio $MINIO_HOST $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

function init() {
    echo "Initializing minio"

    cat <<EOF >/tmp/lifecycle.json
{
  "Rules": [
    {
      "Expiration": {
        "Days": 180
      },
      "ID": "Delete old mob files",
      "Status": "Enabled"
    },
    {
      "Expiration": {
        "Days": 30
      },
      "ID": "Delete flagged mob files after 30 days",
      "Filter": {
        "Tag": {
          "Key": "to_delete_in_days",
          "Value": "30"
        }
      },
      "Status": "Enabled"
    }
  ]
}
EOF

    for bucket in ${buckets[*]}; do
        mc mb minio/${bucket} || true
    done
    # eg: How to setup the lifecycle policy
    # mc ilm import minio/mobs </tmp/lifecycle.json || true

    #####################################################
    # Creating public bucket; Do not change this block!
    # !! PUBLIC BUCKETS !!
    #####################################################
    mc policy set download minio/sessions-assets || true
    mc anonymous set download minio/sessions-assets || true

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
