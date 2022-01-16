#!/bin/bash

set -e

pgdir=/opt/openreplay/openreplay/scripts/helm/db/init_dbs/postgresql

# ENV variables
# Ref: https://www.postgresql.org/docs/current/libpq-envars.html
# $PGHOST
# $PGPORT
# $PGDATABASE
# $PGUSER
# $PGPASSWORD

function migrate() {
    echo "Starting postgresql migration"
    migration_versions=$1
    for version in $migration_versions; do
        echo "Migrating postgresql version $version"
        psql -f ${pgdir}/${version}/${version}.sql
    done
}

function init() {
    echo "Initializing postgresql"
    psql -f ${pgdir}/init_schema.sql
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
