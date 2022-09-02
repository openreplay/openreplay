#!/bin/bash

set -ex

clickhousedir=/opt/openreplay/openreplay/scripts/helm/db/init_dbs/clickhouse

function migrate() {
    echo "Starting clickhouse migration"
    IFS=',' read -r -a migration_versions <<< "$1"
    for version in ${migration_versions[*]}; do
        echo "Migrating clickhouse version $version"
        # For now, we can ignore the clickhouse db inject errors.
        # TODO: Better error handling in script
        clickhouse-client -h clickhouse-openreplay-clickhouse.db.svc.cluster.local --port 9000 --multiquery < ${clickhousedir}/${version}/${version}.sql || true
    done
}

function init() {
    echo "Initializing clickhouse"
    for file in `ls ${clickhousedir}/create/*.sql`; do
        echo "Injecting $file"
        clickhouse-client -h clickhouse-openreplay-clickhouse.db.svc.cluster.local --port 9000 --multiquery < $file || true
    done
}

# /bin/bash clickhouse.sh migrate $migration_versions
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
