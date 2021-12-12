#!/bin/bash

set -e

clickhousedir=/opt/openreplay/openreplay/scripts/helm/db/init_dbs/clickhouse

function migrate() {
    echo "Starting postgresql migration"
    migration_versions=$1
    for version in $migration_versions; do
        echo "Migrating postgresql version $version"
        clickhouse-client -h clickhouse.db.svc.cluster.local -p 9000 < ${clickhousedir}/${version}/${version}.sql
    done
}

function init() {
    echo "Initializing postgresql"
    for file in `ls ${clickhousedir}/create/*.sql`; do
        clickhouse-client  -h clickhouse.db.svc.cluster.local -p 9000 < $file
    done
}

# /bin/bash postgresql.sh migrate $migration_versions
case "$1" in
    migrate)
        migrate $2
        ;;
    init)
        init
        ;;
    *)
        echo "Unknown operation for clickhouse migration; exiting."
        exit 1
        ;;
esac
