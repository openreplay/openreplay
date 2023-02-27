#!/bin/bash

set -ex

clickhousedir=/opt/openreplay/openreplay/scripts/schema/db/init_dbs/clickhouse

[[ "${CH_PASSWORD}" == "" ]] || {
  CH_PASSWORD="--password $CH_PASSWORD"
}

function migrate() {
    echo "Starting clickhouse migration"
    IFS=',' read -r -a migration_versions <<< "$1"
    for version in ${migration_versions[*]}; do
        echo "Migrating clickhouse version $version"
        # For now, we can ignore the clickhouse db inject errors.
        # TODO: Better error handling in script
        clickhouse-client -h ${CH_HOST} --port ${CH_PORT} --user ${CH_USERNAME} ${CH_PASSWORD} --multiquery < ${clickhousedir}/${version}/${version}.sql || true
    done
}

function init() {
    echo "Initializing clickhouse"
    for file in `ls ${clickhousedir}/create/*.sql`; do
        echo "Injecting $file"
        clickhouse-client -h ${CH_HOST} --user ${CH_USERNAME} ${CH_PASSWORD} --port ${CH_PORT} --multiquery < $file || true
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
