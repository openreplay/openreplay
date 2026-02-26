#!/bin/bash

set -e

cd /tmp

buckets=("mobs" "sessions-assets" "static" "sourcemaps" "sessions-mobile-assets" "quickwit" "vault-data" "records" "spots")

ENABLE_MINIO_LIFECYCLE=${ENABLE_MINIO_LIFECYCLE:-false}
MOB_RETENTION_DAYS=${MOB_RETENTION_DAYS:-180}
TAGGED_DELETE_DAYS=${TAGGED_DELETE_DAYS:-30}

mc alias set minio $MINIO_HOST $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

function init() {
    echo "Initializing minio"

    cat <<EOF >/tmp/lifecycle.json
{
  "Rules": [
    {
      "Expiration": {
        "Days": ${MOB_RETENTION_DAYS}
      },
      "ID": "Delete old mob files",
      "Status": "Enabled"
    },
    {
      "Expiration": {
        "Days": ${TAGGED_DELETE_DAYS}
      },
      "ID": "Delete flagged mob files after configured days",
      "Filter": {
        "Tag": {
          "Key": "to_delete_in_days",
          "Value": "${TAGGED_DELETE_DAYS}"
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
    if [[ "$ENABLE_MINIO_LIFECYCLE" == "true" ]]; then
        mc ilm import minio/mobs </tmp/lifecycle.json || true
    fi

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
