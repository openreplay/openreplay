#!/bin/bash

set -e

cd /tmp

buckets=("mobs" "sessions-assets" "static" "sourcemaps" "sessions-mobile-assets" "quickwit" "vault-data" "records" "spots" "replay-exporter-videos")

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
    # Anonymous read of known keys only; no ListBucket (GHSA-j6c9-g48h-wh4c)
    cat <<EOF >/tmp/sessions-assets-policy.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": ["*"]},
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::sessions-assets/*"]
  }]
}
EOF
    mc anonymous set-json /tmp/sessions-assets-policy.json minio/sessions-assets

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
