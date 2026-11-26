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

    # Safe-init state + version functions (no-op if they already exist)
    $ch_client -q "CREATE FUNCTION IF NOT EXISTS openreplay_migration_state AS() -> -1;"
    $ch_client -q "CREATE FUNCTION IF NOT EXISTS openreplay_version AS() -> 'v0.0.0';"

    # Read current state and version
    local state current_version
    state=$($ch_client -q "SELECT openreplay_migration_state()" | tr -d '[:space:]')
    current_version=$($ch_client -q "SELECT openreplay_version()" | tr -d '[:space:]')

    # Skip if this version is already fully applied (version matches and no migration in progress)
    if [[ "$current_version" == "v$version" && "$state" == "-1" ]]; then
        echo "Version $version already applied (current=$current_version, state=-1). Skipping."
        return 0
    fi

    # Skip if existing DB version is newer than target (downgrade attempt). Don't error, continue to next.
    if [[ "$current_version" != "v0.0.0" && "$state" == "-1" ]]; then
        local cur_stripped="${current_version#v}"
        local newest
        newest=$(printf '%s\n%s\n' "$cur_stripped" "$version" | sort -V | tail -n1)
        if [[ "$cur_stripped" != "$version" && "$newest" == "$cur_stripped" ]]; then
            echo "Existing version $current_version > target v$version. Skipping (no downgrade)."
            return 0
        fi
    fi

    local start_from=$((state + 1))
    echo "Migration state for version $version: state=$state, current_version=$current_version, starting from step $start_from"

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

# Versions to migrate. ClickHouse's own markers decide where to start; the
# requested list (built from the openreplay-version ConfigMap, which only moves
# after a fully successful upgrade) is used only when there are no markers yet.
function migration_versions_from_markers() {
    local requested=$1 state db_version base v
    $ch_client -q "CREATE FUNCTION IF NOT EXISTS openreplay_migration_state AS() -> -1;"
    $ch_client -q "CREATE FUNCTION IF NOT EXISTS openreplay_version AS() -> 'v0.0.0';"
    state=$($ch_client -q "SELECT openreplay_migration_state()" | tr -d '[:space:]')
    db_version=$($ch_client -q "SELECT openreplay_version()" | tr -d '[:space:]')
    migration_versions=()
    if [[ "$db_version" == "v0.0.0" ]]; then
        IFS=',' read -r -a migration_versions <<< "$requested"
        return 0
    fi
    base="${db_version#v}"
    if [[ "$state" != "-1" ]]; then
        if [[ ! -d "${clickhousedir}/${base}" ]]; then
            echo "ERROR: ClickHouse is mid-migration at ${db_version} step ${state}, but this release has no ${base} migration."
            exit 1
        fi
        migration_versions+=("$base")
    fi
    for v in $(ls "$clickhousedir" | grep -v '^create$' | sort -V); do
        if [[ "$v" != "$base" && "$(printf '%s\n%s\n' "$base" "$v" | sort -V | tail -n1)" == "$v" ]]; then
            migration_versions+=("$v")
        fi
    done
    echo "ClickHouse markers ${db_version}/${state}; requested ${requested}; migrating ${migration_versions[*]:-nothing}"
}

function migrate() {
    echo "Starting clickhouse migration"
    migration_versions_from_markers "$1"
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
