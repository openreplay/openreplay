#!/bin/bash

cd $(dirname $0)

function migration() {
    ls -la /opt/openreplay/openreplay
    db=$1
    old_version=$2

    if [[ old_version == $CHART_APP_VERSION ]]; then
        echo "No application version change. Not upgrading."
        exit 0
    fi

    # Checking migration versions
    cd /opt/openreplay/openreplay/scripts/helm
    migration_versions=(`ls -l db/init_dbs/$db | grep -E ^d | awk -v number=${old_version} '$NF > number {print $NF}' | grep -v create`)
    echo "Migration version: $migration_versions"
    
    cd -

    case "$1" in
        postgresql)
            /bin/bash postgresql.sh migrate $migration_versions
            ;;
        chalice)
            /bin/bash chalice.sh migrate $migration_versions
            ;;
        kafka)
            /bin/bash kafka.sh migrate $migration_versions
            ;;
        *)
            echo "Unknown operation for db migration; exiting."
            exit 1
            ;;
        esac
}

function init(){
    case $1 in
        postgresql)
            /bin/bash postgresql.sh init
            ;;
        *)
            echo "Unknown operation for db init; exiting."
            exit 1
            ;;

    esac
}


# dbops.sh true(upgrade) chalice
case "$1" in
    "false")
        init $2
        ;;
    "true")
        migration $2 $CHART_APP_VERSION
        ;;
    *)
        echo "Unknown operation for db migration; exiting."
        exit 1
        ;;
esac
