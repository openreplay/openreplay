#!/bin/bash

set -ex

pgdir=/opt/openreplay/openreplay/scripts/schema/db/init_dbs/postgresql

# ENV variables
# Ref: https://www.postgresql.org/docs/current/libpq-envars.html
# $PGHOST
# $PGPORT
# $PGDATABASE
# $PGUSER
# $PGPASSWORD

function migrate() {
    echo "Starting postgresql migration"
    IFS=',' read -r -a migration_versions <<<"$1"
    for version in ${migration_versions[*]}; do
        echo "Migrating postgresql version $version"
        psql -v ON_ERROR_STOP=1 -f ${pgdir}/${version}/${version}.sql 2>&1
    done
}

function init() {
    echo "Initializing postgresql"
    psql -v ON_ERROR_STOP=1 -f ${pgdir}/init_schema.sql 2>&1
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
    echo "Unknown operation for postgresql migration; exiting."
    exit 1
    ;;
esac
