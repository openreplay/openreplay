#!/bin/bash

set -ex

clickhousedir=/opt/openreplay/openreplay/scripts/schema/db/init_dbs/clickhouse

[[ "${CH_PASSWORD}" == "" ]] || {
  CH_PASSWORD="--password $CH_PASSWORD"
}

[[ "${CH_USE_TLS}" == "true" ]] && CH_TLS_FLAGS="--secure --accept-invalid-certificate" || CH_TLS_FLAGS=""

ch_client="clickhouse-client -h ${CH_HOST} --port ${CH_PORT} --user ${CH_USERNAME} ${CH_PASSWORD} ${CH_TLS_FLAGS}"

function run_numbered_migration() {
    local version=$1
    local version_dir="${clickhousedir}/${version}"

    # Safe-init the state function (no-op if it already exists)
    $ch_client -q "CREATE FUNCTION IF NOT EXISTS openreplay_migration_state AS() -> -1;"

    # Read current state and determine where to start
    local state
    state=$($ch_client -q "SELECT openreplay_migration_state()" | tr -d '[:space:]')
    local start_from=$((state + 1))
    echo "Migration state for version $version: state=$state, starting from step $start_from"

    # Execute numbered files in version-sorted order (sort -V handles 10 > 2 correctly)
    for file in $(ls "${version_dir}"/*.sql | sort -V); do
        local file_num
        file_num=$(basename "$file" .sql)
        if [[ $file_num -lt $start_from ]]; then
            echo "Skipping $file (step $file_num already done)"
            continue
        fi
        echo "Executing $file (step $file_num)"
        $ch_client --multiquery < "$file" || { echo "FAILED at $file (step $file_num)"; exit 1; }
    done

    # Verify migration completed (state should be -1)
    local final_state
    final_state=$($ch_client -q "SELECT openreplay_migration_state()" | tr -d '[:space:]')
    if [[ $final_state -ne -1 ]]; then
        echo "ERROR: Migration for version $version did not complete. Final state: $final_state"
        exit 1
    fi
    echo "Migration for version $version completed successfully"
}

function migrate() {
    echo "Starting clickhouse migration"
    IFS=',' read -r -a migration_versions <<< "$1"
    for version in ${migration_versions[*]}; do
        echo "Migrating clickhouse version $version"
        if [[ -f "${clickhousedir}/${version}/${version}.sql" ]]; then
            # Old-style: single file migration (pre-1.23.0)
            # Keep || true — these files have no throwIf guards and contain non-idempotent DDL
            $ch_client --multiquery < "${clickhousedir}/${version}/${version}.sql" || true
        else
            # New-style: numbered files with resume support (1.23.0+)
            run_numbered_migration "$version"
        fi
    done
}

function init() {
    echo "Initializing clickhouse"
    for file in $(ls "${clickhousedir}"/create/*.sql); do
        echo "Injecting $file"
        $ch_client --multiquery < "$file" || true
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
